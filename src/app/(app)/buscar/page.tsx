"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";

// ── Icono por categoría ──────────────────────────────────────────────
const CAT_ICON: Record<string, string> = {
  Comida: "🍽",
  Supermercado: "🛒",
  Transporte: "🚗",
  Entretenimiento: "🎬",
  Salud: "💊",
  Servicios: "⚡",
  Ropa: "👕",
  Hogar: "🏠",
  Educación: "📚",
  Otros: "📦",
};

type FiltroTipo = "todos" | "gastos" | "ingresos";

// ── Skeleton helper ──────────────────────────────────────────────────
function FilaSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 16px",
      }}
    >
      <div
        className="skeleton"
        style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0 }}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <div className="skeleton" style={{ width: "42%", height: 12, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: "24%", height: 10, borderRadius: 5 }} />
      </div>
      <div className="skeleton" style={{ width: 60, height: 13, borderRadius: 6 }} />
    </div>
  );
}

// ── Agrupar por fecha ────────────────────────────────────────────────
function agruparPorFecha(txs: Transaccion[]): [string, Transaccion[]][] {
  const hoy = new Date().toISOString().split("T")[0];
  const ayer = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  const grupos: Record<string, Transaccion[]> = {};
  for (const t of txs) {
    const etiqueta =
      t.fecha === hoy
        ? "Hoy"
        : t.fecha === ayer
        ? "Ayer"
        : new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
          });
    if (!grupos[etiqueta]) grupos[etiqueta] = [];
    grupos[etiqueta].push(t);
  }
  return Object.entries(grupos);
}

// ── Componente principal ─────────────────────────────────────────────
export default function BuscarPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [inputFocused, setInputFocused] = useState(false);

  // ── Carga inicial ──
  useEffect(() => {
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
    cargar();
  }, []);

  // ── Autofocus al montar ──
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // ── Filtrado ──────────────────────────────────────────────────────
  const queryLower = query.trim().toLowerCase();

  const resultado = transacciones.filter((t) => {
    if (!queryLower) return false;

    const coincideTexto =
      t.descripcion?.toLowerCase().includes(queryLower) ||
      t.categoria?.toLowerCase().includes(queryLower);

    const coincideTipo =
      filtroTipo === "todos"
        ? true
        : filtroTipo === "gastos"
        ? t.tipo === "gasto"
        : t.tipo === "ingreso";

    return coincideTexto && coincideTipo;
  });

  const grupos = agruparPorFecha(resultado);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        paddingBottom: 120,
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          padding: "56px 20px 0",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        {/* Botón atrás */}
        <button
          onClick={() => router.back()}
          className="active:opacity-50 transition-opacity"
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
            marginTop: 2,
          }}
          aria-label="Volver"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--text-2)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 14, height: 14 }}
          >
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>

        {/* Títulos */}
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-3)",
              marginBottom: 2,
            }}
          >
            Buscar
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              color: "var(--text-1)",
              lineHeight: 1.1,
            }}
          >
            Transacciones
          </h1>
        </div>
      </div>

      {/* ── BUSCADOR ── */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ position: "relative" }}>
          {/* Ícono lupa */}
          <div
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke={inputFocused ? "var(--gold)" : "var(--text-3)"}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: 16,
                height: 16,
                transition: "stroke 0.2s",
              }}
            >
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
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              width: "100%",
              padding: "13px 16px 13px 42px",
              borderRadius: 14,
              backgroundColor: "var(--surface)",
              border: inputFocused
                ? "1px solid var(--gold-border)"
                : "1px solid var(--border)",
              color: "var(--text-1)",
              fontSize: 14,
              fontWeight: 500,
              outline: "none",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
              WebkitAppearance: "none",
            }}
          />

          {/* Botón limpiar */}
          {query.length > 0 && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 24,
                height: 24,
                borderRadius: 99,
                backgroundColor: "var(--surface-3)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
              aria-label="Borrar búsqueda"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="var(--text-3)"
                strokeWidth={1.8}
                strokeLinecap="round"
                style={{ width: 10, height: 10 }}
              >
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          )}
        </div>

        {/* ── FILTRO TIPO ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "14px 0 10px",
          }}
        >
          {(["todos", "gastos", "ingresos"] as FiltroTipo[]).map((f) => {
            const activo = filtroTipo === f;
            return (
              <button
                key={f}
                onClick={() => setFiltroTipo(f)}
                style={{
                  fontSize: 13,
                  fontWeight: activo ? 700 : 500,
                  color: activo ? "var(--text-1)" : "var(--text-3)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  position: "relative",
                  paddingBottom: 6,
                  transition: "color 0.15s",
                }}
              >
                {f === "todos" ? "Todos" : f === "gastos" ? "Gastos" : "Ingresos"}
                {activo && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 1.5,
                      borderRadius: 99,
                      backgroundColor: "var(--gold)",
                    }}
                  />
                )}
              </button>
            );
          })}

          {/* Contador de resultados */}
          {queryLower && !cargando && (
            <p
              style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--text-3)",
                flexShrink: 0,
              }}
            >
              {resultado.length} resultado{resultado.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ padding: "4px 20px 0" }}>

        {/* Estado cargando */}
        {cargando && (
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            {[1, 2, 3].map((i, idx) => (
              <div
                key={i}
                style={{
                  borderBottom:
                    idx < 2 ? "1px solid var(--border-2)" : "none",
                }}
              >
                <FilaSkeleton />
              </div>
            ))}
          </div>
        )}

        {/* Estado vacío — sin query */}
        {!cargando && !queryLower && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "64px 20px",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-3)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 22, height: 22 }}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-3)",
                textAlign: "center",
              }}
            >
              Escribe para buscar
            </p>
          </div>
        )}

        {/* Sin resultados */}
        {!cargando && queryLower && resultado.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "56px 20px",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 15,
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                marginBottom: 2,
              }}
            >
              🔍
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-2)",
                textAlign: "center",
              }}
            >
              Sin resultados
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              No se encontró nada para{" "}
              <span style={{ color: "var(--text-2)", fontWeight: 600 }}>
                &ldquo;{query.trim()}&rdquo;
              </span>
            </p>
          </div>
        )}

        {/* Lista de resultados agrupados */}
        {!cargando && queryLower && resultado.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {grupos.map(([fecha, txs]) => (
              <div key={fecha}>
                {/* Encabezado de grupo */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--text-3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fecha}
                  </p>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: "var(--border-2)",
                    }}
                  />
                </div>

                {/* Tarjeta del grupo */}
                <div
                  style={{
                    borderRadius: 20,
                    overflow: "hidden",
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {txs.map((t, idx) => {
                    const emoji =
                      t.tipo === "ingreso"
                        ? "💰"
                        : CAT_ICON[t.categoria] || "📦";
                    const esIngreso = t.tipo === "ingreso";

                    return (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "13px 16px",
                          borderBottom:
                            idx < txs.length - 1
                              ? "1px solid var(--border-2)"
                              : "none",
                          transition: "background-color 0.1s",
                        }}
                        onTouchStart={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "var(--surface-2)")
                        }
                        onTouchEnd={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                      >
                        {/* Ícono */}
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 11,
                            backgroundColor: "var(--surface-2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 17,
                            flexShrink: 0,
                          }}
                        >
                          {emoji}
                        </div>

                        {/* Descripción + categoría */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--text-1)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.descripcion || t.categoria || "Sin descripción"}
                          </p>
                          {t.categoria && t.descripcion && (
                            <p
                              style={{
                                fontSize: 11,
                                color: "var(--text-3)",
                                marginTop: 2,
                              }}
                            >
                              {t.categoria}
                            </p>
                          )}
                        </div>

                        {/* Monto */}
                        <p
                          className="font-number"
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            flexShrink: 0,
                            color: esIngreso ? "var(--success)" : "var(--text-1)",
                          }}
                        >
                          {esIngreso ? "+" : "−"}
                          {formatearMonto(t.monto)}
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
    </main>
  );
}
