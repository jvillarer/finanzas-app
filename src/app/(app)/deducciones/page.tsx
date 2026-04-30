"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatearMonto } from "@/lib/transacciones";
import {
  clasificarDeduccion,
  calcularDevolucion,
  detectarNivelColegiatura,
  topeColegiatura,
  ETIQUETAS_DEDUCCION,
  EMOJIS_DEDUCCION,
  type TipoDeduccion,
} from "@/lib/isr-calculator";
import type { Transaccion } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────

interface TxDeducible extends Transaccion {
  tipoDeduccion: NonNullable<TipoDeduccion>;
}

export default function DeduccionesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [cargando, setCargando]         = useState(true);
  const [usuarioId, setUsuarioId]       = useState<string>("");
  const [txDeducibles, setTxDeducibles] = useState<TxDeducible[]>([]);
  const [ingresoAnual, setIngresoAnual] = useState<number>(0);
  const [ingresoManual, setIngresoManual] = useState<string>("");
  const [editandoIngreso, setEditandoIngreso] = useState(false);
  const [guardandoIngreso, setGuardandoIngreso] = useState(false);
  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear());
  const [categoriaAbierta, setCategoriaAbierta] = useState<NonNullable<TipoDeduccion> | null>(null);

  // Años disponibles: el actual y el anterior (para la declaración pasada)
  const anosDisponibles = [new Date().getFullYear(), new Date().getFullYear() - 1];

  useEffect(() => {
    cargarDatos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anoSeleccionado]);

  async function cargarDatos() {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUsuarioId(user.id);

    const [{ data: txs }, { data: perfil }, { data: ingresos }] = await Promise.all([
      supabase
        .from("transacciones")
        .select("*")
        .eq("usuario_id", user.id)
        .eq("tipo", "gasto")
        .gte("fecha", `${anoSeleccionado}-01-01`)
        .lte("fecha", `${anoSeleccionado}-12-31`)
        .order("fecha", { ascending: false }),
      supabase
        .from("perfiles")
        .select("ingreso_anual_estimado")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("transacciones")
        .select("monto")
        .eq("usuario_id", user.id)
        .eq("tipo", "ingreso")
        .gte("fecha", `${anoSeleccionado}-01-01`)
        .lte("fecha", `${anoSeleccionado}-12-31`),
    ]);

    // Clasificar deducciones
    const deducibles: TxDeducible[] = [];
    for (const tx of txs ?? []) {
      const tipo = clasificarDeduccion(tx.categoria, tx.descripcion);
      if (tipo) deducibles.push({ ...tx, tipoDeduccion: tipo });
    }
    setTxDeducibles(deducibles);

    // Ingreso anual: preferir el guardado en perfil, si no usar suma de transacciones
    const ingresoGuardado = perfil?.ingreso_anual_estimado ? Number(perfil.ingreso_anual_estimado) : 0;
    const ingresoTx = (ingresos ?? []).reduce((s, t) => s + Number(t.monto), 0);
    const ingresoFinal = ingresoGuardado > 0 ? ingresoGuardado : ingresoTx;

    setIngresoAnual(ingresoFinal);
    setIngresoManual(String(Math.round(ingresoFinal)));
    setCargando(false);
  }

  // Agrupación por tipo de deducción
  const porTipo = useMemo(() => {
    const grupos: Partial<Record<NonNullable<TipoDeduccion>, TxDeducible[]>> = {};
    for (const tx of txDeducibles) {
      if (!grupos[tx.tipoDeduccion]) grupos[tx.tipoDeduccion] = [];
      grupos[tx.tipoDeduccion]!.push(tx);
    }
    return grupos;
  }, [txDeducibles]);

  const totalDeducible = useMemo(
    () => txDeducibles.reduce((s, t) => s + Number(t.monto), 0),
    [txDeducibles]
  );

  const resultado = useMemo(
    () => calcularDevolucion(ingresoAnual, totalDeducible),
    [ingresoAnual, totalDeducible]
  );

  async function handleGuardarIngreso() {
    const val = parseFloat(ingresoManual.replace(/,/g, ""));
    if (!isNaN(val) && val > 0) {
      setIngresoAnual(val);
      setGuardandoIngreso(true);
      // Persistir en Supabase para que no se pierda al recargar
      await supabase
        .from("perfiles")
        .update({ ingreso_anual_estimado: val })
        .eq("id", usuarioId);
      setGuardandoIngreso(false);
    }
    setEditandoIngreso(false);
  }

  function exportarReporte() {
    const lineas: string[] = [
      `REPORTE DE DEDUCCIONES ISR ${anoSeleccionado}`,
      `Generado: ${new Date().toLocaleDateString("es-MX")}`,
      "",
      `Ingreso anual estimado: ${formatearMonto(ingresoAnual)}`,
      `Total deducible: ${formatearMonto(totalDeducible)}`,
      `Devolución estimada: ${formatearMonto(resultado.devolucionEstimada)}`,
      "",
      "─────────────────────────────",
    ];

    for (const [tipo, txs] of Object.entries(porTipo) as [NonNullable<TipoDeduccion>, TxDeducible[]][]) {
      const subtotal = txs.reduce((s, t) => s + Number(t.monto), 0);
      lineas.push(`\n${ETIQUETAS_DEDUCCION[tipo]}: ${formatearMonto(subtotal)}`);
      for (const tx of txs) {
        lineas.push(`  ${tx.fecha}  ${tx.descripcion || tx.categoria}  ${formatearMonto(Number(tx.monto))}`);
      }
    }

    lineas.push("\n─────────────────────────────");
    lineas.push("*Este es un estimado. Consulta a tu contador para tu declaración oficial.*");

    const contenido = lineas.join("\n");
    const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `deducciones-${anoSeleccionado}.txt`;
    a.click();
    // Revocar después de un tick para dar tiempo al navegador a iniciar la descarga
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        padding: "52px 20px 16px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>
            Deducciones ISR
          </h1>
        </div>

        {/* Selector de año */}
        <div style={{ display: "flex", gap: 8 }}>
          {anosDisponibles.map((ano) => (
            <button
              key={ano}
              onClick={() => setAnoSeleccionado(ano)}
              style={{
                padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                backgroundColor: anoSeleccionado === ano ? "var(--gold)" : "var(--surface-2)",
                color: anoSeleccionado === ano ? "#fff" : "var(--text-3)",
                border: "none", cursor: "pointer",
              }}
            >
              {ano}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-3)", fontSize: 13 }}>
          Calculando deducciones...
        </div>
      ) : (
        <>
          {/* Tarjeta principal — devolución estimada */}
          <div style={{ padding: "16px 16px 8px" }}>
            <div style={{
              borderRadius: 18, padding: "20px 20px 16px",
              background: "linear-gradient(135deg, #1a1200 0%, #2a1e00 100%)",
              border: "1px solid var(--gold-border)",
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                Devolución estimada {anoSeleccionado}
              </p>
              <p className="font-number" style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
                {formatearMonto(resultado.devolucionEstimada)}
              </p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>
                Tasa marginal {resultado.tasaMarginalPct.toFixed(2)}% · Base gravable {formatearMonto(resultado.baseGravableCon)}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Total deducible</p>
                  <p className="font-number" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{formatearMonto(totalDeducible)}</p>
                </div>
                <div style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 12px" }}>
                  <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>ISR sin deducciones</p>
                  <p className="font-number" style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{formatearMonto(resultado.isrSinDeducciones)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ingreso anual */}
          <div style={{ padding: "8px 16px" }}>
            <div style={{
              borderRadius: 14, padding: "12px 16px",
              backgroundColor: "var(--surface)", border: "1px solid var(--border-2)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                  Ingreso anual estimado
                </p>
                {editandoIngreso ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number"
                      value={ingresoManual}
                      onChange={(e) => setIngresoManual(e.target.value)}
                      onBlur={handleGuardarIngreso}
                      onKeyDown={(e) => e.key === "Enter" && handleGuardarIngreso()}
                      autoFocus
                      style={{
                        fontSize: 16, fontWeight: 700, color: "var(--text-1)",
                        background: "none", border: "none", outline: "none",
                        borderBottom: "1px solid var(--gold)", width: 120,
                      }}
                    />
                    <button
                      onMouseDown={(e) => e.preventDefault()} // evita que blur del input dispare doble guardado
                      onClick={handleGuardarIngreso}
                      disabled={guardandoIngreso}
                      style={{ fontSize: 11, color: "var(--gold)", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                    >
                      {guardandoIngreso ? "Guardando..." : "Listo"}
                    </button>
                  </div>
                ) : (
                  <p className="font-number" style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>
                    {formatearMonto(ingresoAnual)}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setIngresoManual(String(Math.round(ingresoAnual))); setEditandoIngreso(true); }}
                style={{ fontSize: 11, color: "var(--gold)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                Editar
              </button>
            </div>
            <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6, paddingLeft: 4 }}>
              Calculado de tus ingresos registrados. Ajústalo si no está completo.
            </p>
          </div>

          {/* Sin deducciones */}
          {txDeducibles.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 32px" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🧾</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>
                Sin deducciones registradas en {anoSeleccionado}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
                Cuando registres gastos médicos, colegiaturas, seguros de gastos médicos o donativos, aparecerán aquí.
              </p>
            </div>
          )}

          {/* Deducciones por categoría */}
          {Object.keys(porTipo).length > 0 && (
            <div style={{ padding: "8px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Por categoría
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, borderRadius: 14, overflow: "hidden", border: "1px solid var(--border-2)" }}>
                {(Object.entries(porTipo) as [NonNullable<TipoDeduccion>, TxDeducible[]][]).map(([tipo, txs]) => {
                  const subtotal = txs.reduce((s, t) => s + Number(t.monto), 0);
                  const pctDelTotal = totalDeducible > 0 ? (subtotal / totalDeducible) * 100 : 0;
                  const abierta = categoriaAbierta === tipo;

                  return (
                    <div key={tipo} style={{ backgroundColor: "var(--surface)" }}>
                      {/* Fila resumen */}
                      <button
                        onClick={() => setCategoriaAbierta(abierta ? null : tipo)}
                        style={{
                          width: "100%", padding: "14px 16px", display: "flex", alignItems: "center",
                          gap: 12, background: "none", border: "none", cursor: "pointer",
                          borderBottom: abierta ? "1px solid var(--border-2)" : "none",
                        }}
                      >
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{EMOJIS_DEDUCCION[tipo]}</span>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
                            {ETIQUETAS_DEDUCCION[tipo]}
                          </p>
                          {/* Barra de progreso */}
                          <div style={{ height: 3, borderRadius: 99, backgroundColor: "var(--surface-2)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pctDelTotal}%`, backgroundColor: "var(--gold)", borderRadius: 99 }} />
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p className="font-number" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                            {formatearMonto(subtotal)}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--text-3)" }}>
                            {txs.length} movimiento{txs.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <span style={{ color: "var(--text-3)", fontSize: 11, flexShrink: 0, transform: abierta ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                      </button>

                      {/* Detalle de transacciones */}
                      {abierta && (
                        <div>
                          {/* Aviso de tope para colegiaturas */}
                          {tipo === "colegiatura" && (() => {
                            // Detectar nivel desde la primera tx que lo tenga
                            const nivel = txs.map((t) => detectarNivelColegiatura(t.descripcion)).find(Boolean) ?? null;
                            const tope  = nivel ? topeColegiatura(nivel) : null;
                            const total = txs.reduce((s, t) => s + Number(t.monto), 0);
                            if (!tope) return (
                              <div style={{ padding: "8px 16px 8px 52px", backgroundColor: "rgba(245,158,11,0.06)" }}>
                                <p style={{ fontSize: 10, color: "#f59e0b" }}>
                                  💡 Agrega el nivel educativo a la descripción (ej: "Colegiatura primaria") para ver el tope exacto.
                                </p>
                              </div>
                            );
                            const restante = Math.max(0, tope - total);
                            const excedido = total > tope;
                            return (
                              <div style={{ padding: "8px 16px 8px 52px", backgroundColor: excedido ? "rgba(240,110,110,0.06)" : "rgba(245,158,11,0.06)" }}>
                                <p style={{ fontSize: 10, color: excedido ? "var(--danger)" : "#f59e0b", fontWeight: 600 }}>
                                  {nivel.charAt(0).toUpperCase() + nivel.slice(1)} · Tope {formatearMonto(tope)}
                                  {excedido
                                    ? ` · ⚠ Excedido en ${formatearMonto(total - tope)}`
                                    : ` · Te quedan ${formatearMonto(restante)}`}
                                </p>
                              </div>
                            );
                          })()}

                          {txs.map((tx) => (
                            <div
                              key={tx.id}
                              style={{
                                padding: "10px 16px 10px 52px",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                borderBottom: "1px solid var(--border-2)",
                              }}
                            >
                              <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
                                  {tx.descripcion || tx.categoria}
                                </p>
                                <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>{tx.fecha}</p>
                              </div>
                              <p className="font-number" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)" }}>
                                {formatearMonto(Number(tx.monto))}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disclaimer + exportar */}
          {txDeducibles.length > 0 && (
            <div style={{ padding: "8px 16px 16px" }}>
              <p style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.6, marginBottom: 14, paddingLeft: 4, paddingRight: 4 }}>
                * Estimado basado en las tablas ISR 2024 (Art. 152 LISR). No incluye subsidio al empleo, retenciones del empleador ni deducciones por aportaciones a AFORE. Consulta a un contador para tu declaración oficial.
              </p>
              <button
                onClick={exportarReporte}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 14,
                  fontSize: 14, fontWeight: 700,
                  backgroundColor: "var(--surface-2)", color: "var(--text-1)",
                  border: "1px solid var(--border-2)", cursor: "pointer",
                }}
              >
                📄 Exportar reporte para contador
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
