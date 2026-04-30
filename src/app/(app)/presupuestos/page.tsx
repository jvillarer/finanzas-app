"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { obtenerTransacciones, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════
const CATEGORIAS = [
  "Comida", "Supermercado", "Transporte", "Entretenimiento",
  "Salud", "Servicios", "Ropa", "Hogar", "Educación", "Otros",
] as const;

const CAT_ICON: Record<string, string> = {
  Comida: "🍽", Supermercado: "🛒", Transporte: "🚗",
  Entretenimiento: "🎬", Salud: "💊", Servicios: "⚡",
  Ropa: "👕", Hogar: "🏠", Educación: "📚", Otros: "📦",
};

interface Presupuesto {
  id: string;
  categoria: string;
  limite: number;
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function colorBarra(pct: number): string {
  if (pct >= 100) return "var(--danger)";
  if (pct >= 80) return "#f59e0b";
  return "var(--success)";
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

// ══════════════════════════════════════════════════════════
// MODAL EDITAR PRESUPUESTO
// ══════════════════════════════════════════════════════════
function ModalPresupuesto({
  categoria,
  valorActual,
  guardando,
  onGuardar,
  onEliminar,
  onCerrar,
}: {
  categoria: string;
  valorActual: number | null;
  guardando: boolean;
  onGuardar: (monto: number) => void;
  onEliminar: () => void;
  onCerrar: () => void;
}) {
  const [monto, setMonto] = useState(valorActual ? String(valorActual) : "");

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div style={{
        width: "100%", borderRadius: "24px 24px 0 0",
        backgroundColor: "var(--surface)",
        padding: "24px 20px 40px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: "var(--gold-dim)",
            border: "1px solid var(--gold-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0,
          }}>
            {CAT_ICON[categoria] || "📦"}
          </div>
          <div>
            <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Presupuesto mensual
            </p>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>{categoria}</h3>
          </div>
        </div>

        <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
          Límite mensual (MXN)
        </label>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            fontSize: 16, fontWeight: 700, color: "var(--text-3)",
          }}>$</span>
          <input
            type="number"
            inputMode="decimal"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0"
            autoFocus
            style={{
              width: "100%", padding: "14px 16px 14px 32px",
              borderRadius: 14, fontSize: 20, fontWeight: 700,
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Atajos rápidos */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[1000, 2000, 3000, 5000].map((v) => (
            <button
              key={v}
              onClick={() => setMonto(String(v))}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600,
                backgroundColor: Number(monto) === v ? "var(--gold-dim)" : "var(--surface-2)",
                border: Number(monto) === v ? "1px solid var(--gold-border)" : "1px solid var(--border)",
                color: Number(monto) === v ? "var(--gold)" : "var(--text-2)",
                cursor: "pointer",
              }}
            >
              ${(v / 1000).toFixed(0)}k
            </button>
          ))}
        </div>

        <button
          onClick={() => { const n = Number(monto); if (n > 0) onGuardar(n); }}
          disabled={!monto || Number(monto) <= 0 || guardando}
          style={{
            width: "100%", padding: "15px 0", borderRadius: 14,
            fontSize: 15, fontWeight: 700,
            backgroundColor: "var(--gold)", color: "#fff",
            border: "none", cursor: "pointer",
            opacity: !monto || Number(monto) <= 0 || guardando ? 0.4 : 1,
            marginBottom: 10,
          }}
        >
          {guardando ? "Guardando..." : valorActual ? "Actualizar límite" : "Crear presupuesto"}
        </button>

        {valorActual && (
          <button
            onClick={onEliminar}
            disabled={guardando}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 14,
              fontSize: 13, fontWeight: 600,
              backgroundColor: "var(--danger-dim)",
              color: "var(--danger)",
              border: "1px solid rgba(240,110,110,0.2)",
              cursor: "pointer",
            }}
          >
            Quitar presupuesto
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [categoriaEditar, setCategoriaEditar] = useState<string | null>(null);
  const [soloConPresupuesto, setSoloConPresupuesto] = useState(false);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: pres }, txs] = await Promise.all([
      supabase.from("presupuestos").select("*").eq("usuario_id", user.id),
      obtenerTransacciones(),
    ]);

    setPresupuestos((pres ?? []) as Presupuesto[]);
    setTransacciones(txs);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Gasto del mes actual por categoría
  const gastoMes = useMemo(() => {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const mapa: Record<string, number> = {};
    transacciones
      .filter((t) => {
        const f = new Date(t.fecha + "T12:00:00");
        return t.tipo === "gasto" && f >= inicio && f <= fin;
      })
      .forEach((t) => {
        const cat = t.categoria || "Otros";
        mapa[cat] = (mapa[cat] || 0) + Number(t.monto);
      });
    return mapa;
  }, [transacciones]);

  // Totales para el resumen
  const totalPresupuestado = useMemo(
    () => presupuestos.reduce((s, p) => s + Number(p.limite), 0),
    [presupuestos]
  );
  const totalGastadoEnPresupuestadas = useMemo(
    () => presupuestos.reduce((s, p) => s + (gastoMes[p.categoria] ?? 0), 0),
    [presupuestos, gastoMes]
  );
  const pctTotal = totalPresupuestado > 0
    ? Math.min((totalGastadoEnPresupuestadas / totalPresupuestado) * 100, 100)
    : 0;

  const handleGuardar = async (monto: number) => {
    if (!categoriaEditar) return;
    setGuardando(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGuardando(false); return; }

    await supabase.from("presupuestos").upsert({
      usuario_id: user.id,
      categoria: categoriaEditar,
      limite: monto,
    }, { onConflict: "usuario_id,categoria" });

    await cargar();
    setCategoriaEditar(null);
    setGuardando(false);
  };

  const handleEliminar = async () => {
    if (!categoriaEditar) return;
    setGuardando(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGuardando(false); return; }

    await supabase.from("presupuestos")
      .delete()
      .eq("usuario_id", user.id)
      .eq("categoria", categoriaEditar);

    await cargar();
    setCategoriaEditar(null);
    setGuardando(false);
  };

  const presupuestoPorCat = useMemo(() => {
    const mapa: Record<string, Presupuesto> = {};
    presupuestos.forEach((p) => { mapa[p.categoria] = p; });
    return mapa;
  }, [presupuestos]);

  const categoriasFiltradas = soloConPresupuesto
    ? CATEGORIAS.filter((c) => presupuestoPorCat[c])
    : CATEGORIAS;

  const mesLabel = new Date().toLocaleString("es-MX", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());

  const categoriaEditarData = categoriaEditar
    ? presupuestoPorCat[categoriaEditar]
    : null;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)", paddingBottom: 120 }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "56px 20px 16px" }}>
        <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
          {mesLabel}
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em" }}>
          Presupuestos
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, lineHeight: 1.5 }}>
          Define límites por categoría y lleva el control de cada peso
        </p>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── RESUMEN TOTAL ── */}
        {presupuestos.length > 0 && !cargando && (
          <div style={{
            padding: "18px", borderRadius: 20,
            background: `linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)`,
            border: `1px solid ${pctTotal >= 100 ? "rgba(240,110,110,0.3)" : pctTotal >= 80 ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.2)"}`,
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>
              Total presupuestado este mes
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p className="font-number" style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, color: colorBarra(pctTotal) }}>
                  {fmt(totalGastadoEnPresupuestadas)}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                  de {formatearMonto(totalPresupuestado)} presupuestados
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className="font-number" style={{ fontSize: 22, fontWeight: 900, color: colorBarra(pctTotal) }}>
                  {pctTotal.toFixed(0)}%
                </p>
                <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                  {pctTotal >= 100 ? "¡Límite alcanzado!" : pctTotal >= 80 ? "¡Cuidado!" : "Vas bien"}
                </p>
              </div>
            </div>

            {/* Barra total */}
            <div style={{ height: 8, borderRadius: 99, backgroundColor: "var(--surface-3)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                width: `${pctTotal}%`,
                backgroundColor: colorBarra(pctTotal),
                transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>

            {/* Categorías en alerta */}
            {presupuestos.filter((p) => {
              const pct = (gastoMes[p.categoria] ?? 0) / Number(p.limite) * 100;
              return pct >= 80;
            }).length > 0 && (
              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                {presupuestos
                  .filter((p) => {
                    const pct = (gastoMes[p.categoria] ?? 0) / Number(p.limite) * 100;
                    return pct >= 80;
                  })
                  .map((p) => {
                    const pct = (gastoMes[p.categoria] ?? 0) / Number(p.limite) * 100;
                    return (
                      <span key={p.categoria} style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                        backgroundColor: pct >= 100 ? "rgba(240,110,110,0.12)" : "rgba(245,158,11,0.12)",
                        color: pct >= 100 ? "var(--danger)" : "#f59e0b",
                      }}>
                        {CAT_ICON[p.categoria]} {p.categoria} {pct >= 100 ? "⚠" : ""}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── FILTRO ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
            {presupuestos.length === 0 ? "Elige qué categorías controlar" : "Tus categorías"}
          </p>
          {presupuestos.length > 0 && (
            <button
              onClick={() => setSoloConPresupuesto((v) => !v)}
              style={{
                fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
                backgroundColor: soloConPresupuesto ? "var(--gold-dim)" : "var(--surface)",
                color: soloConPresupuesto ? "var(--gold)" : "var(--text-3)",
                border: soloConPresupuesto ? "1px solid var(--gold-border)" : "1px solid var(--border)",
                cursor: "pointer",
              }}
            >
              {soloConPresupuesto ? "Con límite" : "Todas"}
            </button>
          )}
        </div>

        {/* ── LISTA DE CATEGORÍAS ── */}
        {cargando ? (
          <div style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ padding: "16px", borderBottom: "1px solid var(--border-2)" }}>
                <div className="skeleton" style={{ height: 12, width: "40%", borderRadius: 6, marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 6, width: "100%", borderRadius: 99 }} />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            {categoriasFiltradas.map((cat, idx) => {
              const presupuesto = presupuestoPorCat[cat];
              const gastado = gastoMes[cat] ?? 0;
              const limite = presupuesto ? Number(presupuesto.limite) : 0;
              const pct = limite > 0 ? Math.min((gastado / limite) * 100, 100) : 0;
              const tieneLimite = !!presupuesto;

              return (
                <div
                  key={cat}
                  onClick={() => setCategoriaEditar(cat)}
                  style={{
                    padding: "14px 16px",
                    borderBottom: idx < categoriasFiltradas.length - 1 ? "1px solid var(--border-2)" : "none",
                    cursor: "pointer",
                    transition: "background-color 0.1s",
                  }}
                  onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                  onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: tieneLimite ? 10 : 0 }}>
                    {/* Ícono */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 11,
                      backgroundColor: tieneLimite ? "var(--gold-dim)" : "var(--surface-2)",
                      border: tieneLimite ? "1px solid var(--gold-border)" : "1px solid transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 17, flexShrink: 0,
                    }}>
                      {CAT_ICON[cat]}
                    </div>

                    {/* Nombre + montos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{cat}</p>
                        {tieneLimite ? (
                          <div style={{ textAlign: "right" }}>
                            <p className="font-number" style={{
                              fontSize: 13, fontWeight: 700,
                              color: colorBarra(pct),
                            }}>
                              {fmt(gastado)} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>/ {fmt(limite)}</span>
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {gastado > 0 && (
                              <p className="font-number" style={{ fontSize: 12, color: "var(--text-3)" }}>
                                {fmt(gastado)} este mes
                              </p>
                            )}
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                              backgroundColor: "var(--surface-2)",
                              color: "var(--text-3)",
                              border: "1px dashed var(--border)",
                            }}>
                              + Límite
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {tieneLimite && (
                    <div>
                      <div style={{ height: 5, borderRadius: 99, backgroundColor: "var(--surface-3)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99,
                          width: `${pct}%`,
                          backgroundColor: colorBarra(pct),
                          transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                        <p style={{ fontSize: 10, color: "var(--text-3)" }}>
                          {pct >= 100 ? "⚠ Límite alcanzado" : pct >= 80 ? "¡Casi al límite!" : `${pct.toFixed(0)}% usado`}
                        </p>
                        <p style={{ fontSize: 10, color: pct >= 80 ? colorBarra(pct) : "var(--text-3)" }}>
                          {pct < 100 ? `${fmt(limite - gastado)} restante` : `${fmt(gastado - limite)} excedido`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tip cuando no hay presupuestos */}
        {!cargando && presupuestos.length === 0 && (
          <div style={{
            padding: "14px 16px", borderRadius: 16,
            backgroundColor: "var(--gold-dim)",
            border: "1px solid var(--gold-border)",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
            <p style={{ fontSize: 12, color: "var(--gold)", lineHeight: 1.55 }}>
              Toca cualquier categoría para definir tu límite mensual. Lani te avisará cuando vayas a pasarte.
            </p>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {categoriaEditar && (
        <ModalPresupuesto
          categoria={categoriaEditar}
          valorActual={categoriaEditarData ? Number(categoriaEditarData.limite) : null}
          guardando={guardando}
          onGuardar={handleGuardar}
          onEliminar={handleEliminar}
          onCerrar={() => setCategoriaEditar(null)}
        />
      )}
    </main>
  );
}
