"use client";

import { useState } from "react";
import { crearTransaccion } from "@/lib/transacciones";

const CATEGORIAS = [
  { nombre: "Comida",          emoji: "🍽" },
  { nombre: "Supermercado",    emoji: "🛒" },
  { nombre: "Transporte",      emoji: "🚗" },
  { nombre: "Entretenimiento", emoji: "🎬" },
  { nombre: "Salud",           emoji: "💊" },
  { nombre: "Servicios",       emoji: "⚡" },
  { nombre: "Ropa",            emoji: "👕" },
  { nombre: "Hogar",           emoji: "🏠" },
  { nombre: "Educación",       emoji: "📚" },
  { nombre: "Otros",           emoji: "📦" },
];

interface Props {
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function NuevaTransaccion({ onCerrar, onGuardado }: Props) {
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) { setError("Ingresa un monto válido"); return; }
    if (!categoria) { setError("Selecciona una categoría"); return; }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaDate = new Date(fecha + "T00:00:00");
    if (isNaN(fechaDate.getTime())) { setError("Fecha inválida"); return; }
    if (fechaDate > hoy) { setError("La fecha no puede ser futura"); return; }
    if (fechaDate.getFullYear() < 2000) { setError("Fecha demasiado antigua"); return; }
    setGuardando(true); setError("");
    try {
      await crearTransaccion({ monto: Number(monto), descripcion, categoria, tipo, fecha });
      onGuardado();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const lbl = (txt: string) => (
    <label style={{ display: "block", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-3)", marginBottom: 8 }}>
      {txt}
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className="w-full pt-4 pb-10 px-5 slide-up"
        style={{
          backgroundColor: "var(--surface)",
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          maxHeight: "92vh",
          overflowY: "auto",
          borderTop: "1px solid var(--border)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 32, height: 2, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em" }}>Nuevo movimiento</h2>
          <button
            onClick={onCerrar}
            style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 13, height: 13 }}>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tipo — text-based, not pill */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 3, borderRadius: 10, backgroundColor: "var(--surface-2)" }}>
          {(["gasto", "ingreso"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              style={{
                flex: 1, padding: "9px 0",
                borderRadius: 8,
                fontSize: 12, fontWeight: 700,
                backgroundColor: tipo === t ? "var(--bg)" : "transparent",
                color: tipo === t
                  ? (t === "ingreso" ? "var(--success)" : "var(--danger)")
                  : "var(--text-3)",
                border: tipo === t ? "1px solid var(--border)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t === "ingreso" ? "↑ Ingreso" : "↓ Gasto"}
            </button>
          ))}
        </div>

        {/* Monto */}
        <div style={{ marginBottom: 16 }}>
          {lbl("Monto")}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700, color: "var(--text-3)" }}>$</span>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={monto} onChange={(e) => setMonto(e.target.value)}
              className="font-number"
              style={{
                width: "100%", borderRadius: 12, paddingLeft: 34, paddingRight: 14, paddingTop: 14, paddingBottom: 14,
                fontSize: 26, fontWeight: 800, outline: "none",
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>
        </div>

        {/* Descripción */}
        <div style={{ marginBottom: 16 }}>
          {lbl("Descripción")}
          <input
            type="text" placeholder="¿En qué gastaste?"
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            style={{
              width: "100%", borderRadius: 12, padding: "12px 14px",
              fontSize: 14, fontWeight: 500, outline: "none",
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
            }}
          />
        </div>

        {/* Categorías */}
        <div style={{ marginBottom: 16 }}>
          {lbl("Categoría")}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {CATEGORIAS.map((cat) => {
              const activa = categoria === cat.nombre;
              return (
                <button
                  key={cat.nombre}
                  onClick={() => setCategoria(activa ? "" : cat.nombre)}
                  className="active:scale-95 transition-transform"
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "9px 4px",
                    borderRadius: 10,
                    backgroundColor: activa ? "var(--gold-dim)" : "var(--surface-2)",
                    border: activa ? "1px solid var(--gold-border)" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: activa ? "var(--gold)" : "var(--text-3)" }}>
                    {cat.nombre.length > 6 ? cat.nombre.slice(0, 6) + "…" : cat.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fecha */}
        <div style={{ marginBottom: 20 }}>
          {lbl("Fecha")}
          <input
            type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            style={{
              width: "100%", borderRadius: 12, padding: "12px 14px",
              fontSize: 14, fontWeight: 500, outline: "none",
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
            }}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleGuardar} disabled={guardando}
          className="active:scale-[0.98] transition-transform"
          style={{
            width: "100%", fontWeight: 700, padding: "14px 0", borderRadius: 12,
            fontSize: 14, backgroundColor: "var(--gold)", color: "#0c0c0e",
            border: "none", cursor: "pointer", opacity: guardando ? 0.4 : 1,
          }}
        >
          {guardando ? "Guardando..." : "Guardar movimiento"}
        </button>
      </div>
    </div>
  );
}
