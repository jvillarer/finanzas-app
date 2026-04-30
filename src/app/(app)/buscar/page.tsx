"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";
import EditarTransaccion from "@/components/EditarTransaccion";

// ══════════════════════════════════════════════════════════
// CONSTANTES
// ══════════════════════════════════════════════════════════
const CAT_ICON: Record<string, string> = {
  Comida: "🍽", Supermercado: "🛒", Transporte: "🚗",
  Entretenimiento: "🎬", Salud: "💊", Servicios: "⚡",
  Ropa: "👕", Hogar: "🏠", Educación: "📚", Otros: "📦",
};

const CATEGORIAS = [
  "Comida", "Supermercado", "Transporte", "Entretenimiento",
  "Salud", "Servicios", "Ropa", "Hogar", "Educación", "Otros",
];

type FiltroTipo = "todos" | "gastos" | "ingresos";

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function agruparPorFecha(txs: Transaccion[]): [string, Transaccion[]][] {
  const hoy = new Date().toISOString().split("T")[0];
  const ayer = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  const grupos: Record<string, Transaccion[]> = {};
  for (const t of txs) {
    const etiqueta =
      t.fecha === hoy ? "Hoy"
      : t.fecha === ayer ? "Ayer"
      : new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    if (!grupos[etiqueta]) grupos[etiqueta] = [];
    grupos[etiqueta].push(t);
  }
  return Object.entries(grupos);
}

// Genera lista de meses disponibles desde la primera tx
function generarMeses(txs: Transaccion[]): Array<{ label: string; value: string }> {
  if (txs.length === 0) return [];
  const hoy = new Date();
  const meses: Array<{ label: string; value: string }> = [];

  // Encontrar el mes más antiguo
  const fechaMin = txs.reduce((min, t) => t.fecha < min ? t.fecha : min, txs[0].fecha);
  const inicio = new Date(fechaMin + "T12:00:00");

  const actual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const limite = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

  let cursor = actual;
  while (cursor >= limite) {
    const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = cursor.toLocaleString("es-MX", { month: "long", year: "numeric" })
      .replace(/^\w/, (c) => c.toUpperCase());
    meses.push({ label, value });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    if (meses.length > 24) break; // máx 2 años
  }

  return meses;
}

function FilaSkeleton() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px" }}>
      <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <div className="skeleton" style={{ width: "42%", height: 12, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: "24%", height: 10, borderRadius: 5 }} />
      </div>
      <div className="skeleton" style={{ width: 60, height: 13, borderRadius: 6 }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function BuscarPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [filtroMes, setFiltroMes] = useState<string | null>(null); // "2026-04"
  const [inputFocused, setInputFocused] = useState(false);
  const [txEditar, setTxEditar] = useState<Transaccion | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const cargar = async () => {
    try {
      const datos = await obtenerTransacciones();
      setTransacciones(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const mesesDisponibles = useMemo(() => generarMeses(transacciones), [transacciones]);

  // ── Filtrado ──────────────────────────────────────────────
  const resultado = useMemo(() => {
    const queryLower = query.trim().toLowerCase();
    return transacciones.filter((t) => {
      // Texto
      if (queryLower) {
        const coincide = t.descripcion?.toLowerCase().includes(queryLower) ||
          t.categoria?.toLowerCase().includes(queryLower);
        if (!coincide) return false;
      }
      // Tipo
      if (filtroTipo === "gastos" && t.tipo !== "gasto") return false;
      if (filtroTipo === "ingresos" && t.tipo !== "ingreso") return false;
      // Categoría
      if (filtroCategoria && t.categoria !== filtroCategoria) return false;
      // Mes
      if (filtroMes) {
        const [anio, mes] = filtroMes.split("-").map(Number);
        const f = new Date(t.fecha + "T12:00:00");
        if (f.getFullYear() !== anio || f.getMonth() + 1 !== mes) return false;
      }
      return true;
    });
  }, [transacciones, query, filtroTipo, filtroCategoria, filtroMes]);

  const grupos = useMemo(() => agruparPorFecha(resultado), [resultado]);

  // Suma para el header de resultados
  const resumenResultados = useMemo(() => {
    const gastos = resultado.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
    const ingresos = resultado.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
    return { gastos, ingresos };
  }, [resultado]);

  const hayFiltrosActivos = filtroTipo !== "todos" || filtroCategoria || filtroMes;
  const hayQuery = query.trim().length > 0;
  const mostrarResultados = hayQuery || hayFiltrosActivos;

  const limpiarFiltros = () => {
    setFiltroTipo("todos");
    setFiltroCategoria(null);
    setFiltroMes(null);
  };

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)", paddingBottom: 120 }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "56px 20px 0", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <button
          onClick={() => router.back()}
          className="active:opacity-50 transition-opacity"
          style={{
            width: 36, height: 36, borderRadius: 11,
            backgroundColor: "var(--surface-2)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, cursor: "pointer", marginTop: 2,
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="var(--text-2)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 2 }}>
            Buscar y filtrar
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text-1)", lineHeight: 1.1 }}>
            Transacciones
          </h1>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA ── */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
            pointerEvents: "none", display: "flex", alignItems: "center",
          }}>
            <svg viewBox="0 0 20 20" fill="none" stroke={inputFocused ? "var(--gold)" : "var(--text-3)"}
              strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 16, height: 16, transition: "stroke 0.2s" }}>
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13.5 13.5L17 17" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Busca por descripción o categoría..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              width: "100%", padding: "13px 44px 13px 42px",
              borderRadius: 14, fontSize: 14, fontWeight: 500,
              backgroundColor: "var(--surface)",
              border: inputFocused ? "1px solid var(--gold-border)" : "1px solid var(--border)",
              color: "var(--text-1)", outline: "none",
              transition: "border-color 0.2s", boxSizing: "border-box",
              WebkitAppearance: "none",
            }}
          />
          {/* Botón filtros */}
          <button
            onClick={() => setMostrarFiltros((v) => !v)}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              width: 30, height: 30, borderRadius: 8,
              backgroundColor: hayFiltrosActivos ? "var(--gold-dim)" : "var(--surface-2)",
              border: hayFiltrosActivos ? "1px solid var(--gold-border)" : "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke={hayFiltrosActivos ? "var(--gold)" : "var(--text-3)"}
              strokeWidth={1.6} strokeLinecap="round" style={{ width: 12, height: 12 }}>
              <path d="M1 3h14M4 8h8M7 13h2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── PANEL DE FILTROS ── */}
      {mostrarFiltros && (
        <div style={{
          margin: "10px 20px 0",
          padding: "16px",
          borderRadius: 16,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}>
          {/* Tipo */}
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
            Tipo
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {([
              { key: "todos", label: "Todos" },
              { key: "gastos", label: "Gastos" },
              { key: "ingresos", label: "Ingresos" },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setFiltroTipo(key)} style={{
                flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600,
                backgroundColor: filtroTipo === key ? "var(--gold-dim)" : "var(--surface-2)",
                color: filtroTipo === key ? "var(--gold)" : "var(--text-3)",
                border: filtroTipo === key ? "1px solid var(--gold-border)" : "1px solid transparent",
                cursor: "pointer",
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Mes */}
          {mesesDisponibles.length > 0 && (
            <>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
                Mes
              </p>
              <div style={{ overflowX: "auto", display: "flex", gap: 6, marginBottom: 16, paddingBottom: 4 }}>
                <button
                  onClick={() => setFiltroMes(null)}
                  style={{
                    flexShrink: 0, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                    backgroundColor: !filtroMes ? "var(--gold-dim)" : "var(--surface-2)",
                    color: !filtroMes ? "var(--gold)" : "var(--text-3)",
                    border: !filtroMes ? "1px solid var(--gold-border)" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  Todos
                </button>
                {mesesDisponibles.slice(0, 12).map(({ label, value }) => (
                  <button key={value} onClick={() => setFiltroMes(value)} style={{
                    flexShrink: 0, padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                    backgroundColor: filtroMes === value ? "var(--gold-dim)" : "var(--surface-2)",
                    color: filtroMes === value ? "var(--gold)" : "var(--text-3)",
                    border: filtroMes === value ? "1px solid var(--gold-border)" : "1px solid transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Categoría */}
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
            Categoría
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: hayFiltrosActivos ? 14 : 0 }}>
            <button
              onClick={() => setFiltroCategoria(null)}
              style={{
                padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                backgroundColor: !filtroCategoria ? "var(--gold-dim)" : "var(--surface-2)",
                color: !filtroCategoria ? "var(--gold)" : "var(--text-3)",
                border: !filtroCategoria ? "1px solid var(--gold-border)" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              Todas
            </button>
            {CATEGORIAS.map((cat) => (
              <button key={cat} onClick={() => setFiltroCategoria(filtroCategoria === cat ? null : cat)} style={{
                padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                backgroundColor: filtroCategoria === cat ? "var(--gold-dim)" : "var(--surface-2)",
                color: filtroCategoria === cat ? "var(--gold)" : "var(--text-3)",
                border: filtroCategoria === cat ? "1px solid var(--gold-border)" : "1px solid transparent",
                cursor: "pointer",
              }}>
                {CAT_ICON[cat]} {cat}
              </button>
            ))}
          </div>

          {/* Limpiar filtros */}
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 12, fontSize: 12, fontWeight: 700,
                backgroundColor: "var(--surface-2)",
                color: "var(--danger)",
                border: "1px solid rgba(240,110,110,0.2)",
                cursor: "pointer",
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ── RESUMEN DE RESULTADOS ── */}
      {mostrarResultados && !cargando && resultado.length > 0 && (
        <div style={{
          margin: "10px 20px 0",
          padding: "10px 14px", borderRadius: 12,
          backgroundColor: "var(--surface)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <p style={{ fontSize: 11, color: "var(--text-3)" }}>
            <strong style={{ color: "var(--text-1)" }}>{resultado.length}</strong> transacciones
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            {resumenResultados.ingresos > 0 && (
              <p className="font-number" style={{ fontSize: 11, fontWeight: 700, color: "var(--success)" }}>
                +{formatearMonto(resumenResultados.ingresos)}
              </p>
            )}
            {resumenResultados.gastos > 0 && (
              <p className="font-number" style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)" }}>
                −{formatearMonto(resumenResultados.gastos)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── CONTENIDO ── */}
      <div style={{ padding: "10px 20px 0" }}>

        {/* Cargando */}
        {cargando && (
          <div style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            {[1, 2, 3].map((i, idx) => (
              <div key={i} style={{ borderBottom: idx < 2 ? "1px solid var(--border-2)" : "none" }}>
                <FilaSkeleton />
              </div>
            ))}
          </div>
        )}

        {/* Estado vacío — sin query ni filtros */}
        {!cargando && !mostrarResultados && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 20px", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>
                Busca o filtra tus movimientos
              </p>
              <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
                Usa la lupa para buscar por nombre,{"\n"}o el ícono de filtros para filtrar por mes y categoría
              </p>
            </div>
          </div>
        )}

        {/* Sin resultados */}
        {!cargando && mostrarResultados && resultado.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 20px", gap: 10 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 15, backgroundColor: "var(--surface)",
              border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 2,
            }}>
              🔍
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", textAlign: "center" }}>Sin resultados</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center", lineHeight: 1.5 }}>
              Prueba cambiando los filtros o el texto
            </p>
            {hayFiltrosActivos && (
              <button onClick={limpiarFiltros} style={{
                marginTop: 4, padding: "8px 20px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                backgroundColor: "var(--surface)", color: "var(--gold)",
                border: "1px solid var(--gold-border)", cursor: "pointer",
              }}>
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {/* Lista de resultados agrupados */}
        {!cargando && mostrarResultados && resultado.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {grupos.map(([fecha, txs]) => (
              <div key={fecha}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.1em", color: "var(--text-3)", whiteSpace: "nowrap",
                  }}>
                    {fecha}
                  </p>
                  <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-2)" }} />
                  {/* Subtotal del día */}
                  <p className="font-number" style={{ fontSize: 10, color: "var(--text-3)", flexShrink: 0 }}>
                    {formatearMonto(txs.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0))}
                  </p>
                </div>

                <div style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  {txs.map((t, idx) => {
                    const emoji = t.tipo === "ingreso" ? "💰" : (CAT_ICON[t.categoria] || "📦");
                    const esIngreso = t.tipo === "ingreso";
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTxEditar(t)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "13px 16px", cursor: "pointer",
                          borderBottom: idx < txs.length - 1 ? "1px solid var(--border-2)" : "none",
                          transition: "background-color 0.1s",
                        }}
                        onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                        onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: 11,
                          backgroundColor: "var(--surface-2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 17, flexShrink: 0,
                        }}>
                          {emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 600, color: "var(--text-1)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {t.descripcion || t.categoria || "Sin descripción"}
                          </p>
                          {t.categoria && t.descripcion && (
                            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                              {t.categoria}
                            </p>
                          )}
                        </div>
                        <p className="font-number" style={{
                          fontSize: 13, fontWeight: 600, flexShrink: 0,
                          color: esIngreso ? "var(--success)" : "var(--text-1)",
                        }}>
                          {esIngreso ? "+" : "−"}{formatearMonto(t.monto)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL EDITAR ── */}
      {txEditar && (
        <EditarTransaccion
          transaccion={txEditar}
          onCerrar={() => setTxEditar(null)}
          onGuardado={() => { setTxEditar(null); cargar(); }}
          onEliminado={() => { setTxEditar(null); cargar(); }}
        />
      )}
    </main>
  );
}
