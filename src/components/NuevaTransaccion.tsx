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

  const label = (txt: string) => (
    <label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-3)" }}>
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
        <div className="w-8 h-0.5 rounded-full mx-auto mb-5" style={{ backgroundColor: "var(--surface-3)" }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold" style={{ color: "var(--text-1)" }}>Nuevo movimiento</h2>
          <button
            onClick={onCerrar}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            <svg viewBox="0 0 20 20" fill="var(--text-3)" className="w-3.5 h-3.5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tipo */}
        <div className="flex gap-1.5 mb-6 p-1 rounded-xl" style={{ backgroundColor: "var(--surface-2)" }}>
          {(["gasto", "ingreso"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
              style={{
                backgroundColor: tipo === t ? "var(--surface-3)" : "transparent",
                color: tipo === t ? "var(--text-1)" : "var(--text-3)",
                border: tipo === t ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              {t === "ingreso" ? "💰 Ingreso" : "💸 Gasto"}
            </button>
          ))}
        </div>

        {/* Monto */}
        <div className="mb-5">
          {label("Monto")}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: "var(--text-3)" }}>$</span>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={monto} onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-xl pl-8 pr-4 py-3.5 text-2xl font-black outline-none font-number"
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
              }}
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-5">
          {label("Descripción (opcional)")}
          <input
            type="text" placeholder="Ej. Súper, gasolina, Netflix..."
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm font-medium outline-none"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
            }}
          />
        </div>

        {/* Categorías */}
        <div className="mb-5">
          {label("Categoría")}
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIAS.map((cat) => {
              const activa = categoria === cat.nombre;
              return (
                <button
                  key={cat.nombre}
                  onClick={() => setCategoria(activa ? "" : cat.nombre)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-95"
                  style={{
                    backgroundColor: activa ? "var(--gold-dim)" : "var(--surface-2)",
                    border: activa ? "1px solid var(--gold-border)" : "1px solid transparent",
                  }}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[9px] font-semibold" style={{ color: activa ? "var(--gold)" : "var(--text-3)" }}>
                    {cat.nombre.length > 6 ? cat.nombre.slice(0, 6) + "…" : cat.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fecha */}
        <div className="mb-6">
          {label("Fecha")}
          <input
            type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm font-medium outline-none"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
            }}
          />
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--danger)" }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleGuardar} disabled={guardando}
          className="w-full font-bold py-3.5 rounded-xl disabled:opacity-40 transition-all active:scale-[0.98] text-sm"
          style={{ backgroundColor: "var(--gold)", color: "#0c0c0e" }}
        >
          {guardando ? "Guardando..." : "Guardar movimiento"}
        </button>
      </div>
    </div>
  );
}
