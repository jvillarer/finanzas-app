"use client";

import { useState, useEffect } from "react";
import { crearTransaccion } from "@/lib/transacciones";
import { haptico } from "@/lib/haptics";

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
  // Bloquear scroll del body mientras el sheet está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) { haptico.error(); setError("Ingresa un monto válido"); return; }
    if (!categoria) { haptico.error(); setError("Selecciona una categoría"); return; }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaDate = new Date(fecha + "T00:00:00");
    if (isNaN(fechaDate.getTime())) { haptico.error(); setError("Fecha inválida"); return; }
    if (fechaDate > hoy) { haptico.error(); setError("La fecha no puede ser futura"); return; }
    if (fechaDate.getFullYear() < 2000) { haptico.error(); setError("Fecha demasiado antigua"); return; }
    haptico.medio();
    setGuardando(true); setError("");
    try {
      await crearTransaccion({ monto: Number(monto), descripcion, categoria, tipo, fecha });
      haptico.exito();
      onGuardado();
    } catch (e: unknown) {
      haptico.error();
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
      style={{ backgroundColor: "rgba(0,0,0,0.55)", touchAction: "none" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className="w-full slide-up"
        style={{
          backgroundColor: "var(--surface)",
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
          borderTop: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zona fija: handle + header + tipo */}
        <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
          <div style={{ width: 32, height: 4, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>Nuevo movimiento</h2>
            <button
              onClick={onCerrar}
              style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 13, height: 13 }}>
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: 3, borderRadius: 10, backgroundColor: "var(--surface-2)" }}>
            {(["gasto", "ingreso"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { haptico.ligero(); setTipo(t); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8,
                  fontSize: 13, fontWeight: 700,
                  backgroundColor: tipo === t ? "var(--bg)" : "transparent",
                  color: tipo === t ? (t === "ingreso" ? "var(--success)" : "var(--danger)") : "var(--text-3)",
                  border: tipo === t ? "1px solid var(--border)" : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {t === "ingreso" ? "↑ Ingreso" : "↓ Gasto"}
              </button>
            ))}
          </div>
        </div>

        {/* Zona scrolleable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 8px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
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
                  onClick={() => { haptico.seleccion(); setCategoria(activa ? "" : cat.nombre); }}
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

        </div>{/* fin zona scrolleable */}

        {/* Botón fijo abajo */}
        <div style={{ padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))", flexShrink: 0, borderTop: "1px solid var(--border-2)" }}>
          {error && (
            <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>{error}</p>
            </div>
          )}
          <button
            onClick={handleGuardar} disabled={guardando}
            className="active:scale-[0.98] transition-transform"
            style={{
              width: "100%", fontWeight: 700, padding: "15px 0", borderRadius: 14,
              fontSize: 15, backgroundColor: "#0F2F2F", color: "#ffffff",
              border: "none", cursor: "pointer", opacity: guardando ? 0.5 : 1,
            }}
          >
            {guardando ? "Guardando..." : "Guardar movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}
