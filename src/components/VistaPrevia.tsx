"use client";

import { useState } from "react";
import type { FilaParseada } from "@/lib/parsear-csv";
import { formatearMonto } from "@/lib/transacciones";
import { haptico } from "@/lib/haptics";

const CAT_ICON: Record<string, string> = {
  Comida: "🍽", Supermercado: "🛒", Transporte: "🚗",
  Entretenimiento: "🎬", Salud: "💊", Servicios: "⚡",
  Ropa: "👕", Hogar: "🏠", Educación: "📚", Otros: "📦",
};

interface Props {
  filas: FilaParseada[];
  nombreArchivo: string;
  guardando: boolean;
  duplicados?: Set<number>;         // exactos: misma fecha+monto+tipo+desc → desseleccionados
  posiblesDuplicados?: Set<number>; // posibles: misma fecha+monto+tipo, desc diferente → warning
  onConfirmar: (filasSeleccionadas: FilaParseada[]) => void;
  onCancelar: () => void;
}

export default function VistaPrevia({
  filas,
  nombreArchivo,
  guardando,
  duplicados = new Set(),
  posiblesDuplicados = new Set(),
  onConfirmar,
  onCancelar,
}: Props) {
  // Duplicados exactos → pre-desseleccionados; posibles → seleccionados pero con warning
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(
    new Set(filas.map((_, i) => i).filter((i) => !duplicados.has(i)))
  );
  const hayAlertas = duplicados.size > 0 || posiblesDuplicados.size > 0;
  const [soloNuevas, setSoloNuevas] = useState(hayAlertas);

  const toggleFila = (i: number) => {
    haptico.seleccion();
    setSeleccionadas((prev) => {
      const sig = new Set(prev);
      sig.has(i) ? sig.delete(i) : sig.add(i);
      return sig;
    });
  };

  const toggleTodas = () => {
    const visibles = soloNuevas
      ? filas.map((_, i) => i).filter((i) => !duplicados.has(i))
      : filas.map((_, i) => i);
    const todasVisible = visibles.every((i) => seleccionadas.has(i));
    setSeleccionadas((prev) => {
      const sig = new Set(prev);
      if (todasVisible) visibles.forEach((i) => sig.delete(i));
      else visibles.forEach((i) => sig.add(i));
      return sig;
    });
  };

  const filasFiltradas = soloNuevas
    ? filas.map((f, i) => ({ f, i })).filter(({ i }) => !duplicados.has(i))
    : filas.map((f, i) => ({ f, i }));

  const totalAlertas = duplicados.size + posiblesDuplicados.size;

  const filasSeleccionadas = filas.filter((_, i) => seleccionadas.has(i));
  const totalIngresos = filasSeleccionadas.filter((f) => f.tipo === "ingreso").reduce((s, f) => s + f.monto, 0);
  const totalGastos = filasSeleccionadas.filter((f) => f.tipo === "gasto").reduce((s, f) => s + f.monto, 0);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "var(--bg)" }}>

      {/* Header */}
      <div style={{
        padding: "52px 20px 14px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--surface)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button onClick={onCancelar} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            ← Cancelar
          </button>
          <p style={{ fontSize: 11, color: "var(--text-3)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {nombreArchivo}
          </p>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>Revisar transacciones</h1>
        <p style={{ fontSize: 11, color: "var(--text-3)" }}>
          {seleccionadas.size} de {filas.length} seleccionadas
          {duplicados.size > 0 && (
            <span style={{ color: "var(--danger)", marginLeft: 6 }}>· {duplicados.size} duplicado{duplicados.size !== 1 ? "s" : ""} exacto{duplicados.size !== 1 ? "s" : ""}</span>
          )}
          {posiblesDuplicados.size > 0 && (
            <span style={{ color: "#f59e0b", marginLeft: 6 }}>· {posiblesDuplicados.size} posible{posiblesDuplicados.size !== 1 ? "s" : ""}</span>
          )}
        </p>
      </div>

      {/* Resumen */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        padding: "10px 16px", backgroundColor: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ padding: "10px 12px", borderRadius: 12, backgroundColor: "var(--success-dim)", border: "1px solid rgba(62,207,142,0.15)" }}>
          <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 3 }}>Ingresos</p>
          <p className="font-number" style={{ fontSize: 13, fontWeight: 700, color: "var(--success)" }}>{formatearMonto(totalIngresos)}</p>
        </div>
        <div style={{ padding: "10px 12px", borderRadius: 12, backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.15)" }}>
          <p style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", marginBottom: 3 }}>Gastos</p>
          <p className="font-number" style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>{formatearMonto(totalGastos)}</p>
        </div>
      </div>

      {/* Controles */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border-2)",
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={filasFiltradas.every(({ i }) => seleccionadas.has(i)) && filasFiltradas.length > 0}
            onChange={toggleTodas}
            style={{ width: 15, height: 15, accentColor: "var(--gold)", cursor: "pointer" }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>Seleccionar todas</span>
        </label>

        {hayAlertas && (
          <button
            onClick={() => setSoloNuevas(!soloNuevas)}
            style={{
              fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
              backgroundColor: soloNuevas ? "var(--gold-dim)" : "var(--surface-2)",
              color: soloNuevas ? "var(--gold)" : "var(--text-3)",
              border: soloNuevas ? "1px solid var(--gold-border)" : "1px solid transparent",
              cursor: "pointer",
            }}
          >
            {soloNuevas ? `Solo nuevas (${filas.length - duplicados.size})` : `Ver todas (${filas.length})`}
          </button>
        )}
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filasFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>No hay transacciones nuevas</p>
          </div>
        ) : (
          <div>
            {filasFiltradas.map(({ f: fila, i }) => {
              const esDupExacto  = duplicados.has(i);
              const esDupPosible = posiblesDuplicados.has(i);
              const seleccionada = seleccionadas.has(i);
              const emoji = fila.tipo === "ingreso" ? "💰" : (CAT_ICON[fila.categoria] || "📦");

              return (
                <div
                  key={i}
                  onClick={() => toggleFila(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 16px", cursor: "pointer",
                    borderBottom: "1px solid var(--border-2)",
                    backgroundColor: esDupPosible && seleccionada
                      ? "rgba(245,158,11,0.04)"
                      : seleccionada ? "transparent" : "rgba(0,0,0,0.2)",
                    opacity: seleccionada ? 1 : 0.4,
                    transition: "opacity 0.15s",
                    borderLeft: esDupPosible && seleccionada ? "2px solid #f59e0b" : esDupExacto ? "2px solid var(--danger)" : "2px solid transparent",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={seleccionada}
                    onChange={() => toggleFila(i)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 15, height: 15, accentColor: "var(--gold)", flexShrink: 0, cursor: "pointer" }}
                  />

                  <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {fila.descripcion || "Sin descripción"}
                      </p>
                      {esDupExacto && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, backgroundColor: "rgba(240,110,110,0.12)", color: "var(--danger)", flexShrink: 0 }}>
                          Ya existe
                        </span>
                      )}
                      {esDupPosible && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, backgroundColor: "rgba(245,158,11,0.12)", color: "#f59e0b", flexShrink: 0 }}>
                          ¿Ya lo tienes?
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                      {fila.fecha} · {fila.categoria}
                    </p>
                  </div>

                  <p className="font-number" style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: fila.tipo === "ingreso" ? "var(--success)" : "var(--text-2)" }}>
                    {fila.tipo === "ingreso" ? "+" : "−"}{formatearMonto(fila.monto)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón confirmar */}
      <div style={{ padding: "12px 16px 32px", backgroundColor: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => { haptico.medio(); onConfirmar(filasSeleccionadas); }}
          disabled={seleccionadas.size === 0 || guardando}
          className="active:scale-[0.98] transition-transform"
          style={{
            width: "100%", padding: "15px 0", borderRadius: 14,
            fontSize: 14, fontWeight: 700,
            backgroundColor: "var(--gold)", color: "#ffffff",
            border: "none", cursor: "pointer",
            opacity: seleccionadas.size === 0 || guardando ? 0.4 : 1,
          }}
        >
          {guardando ? "Importando..." : `Importar ${seleccionadas.size} transacciones`}
        </button>
      </div>
    </div>
  );
}
