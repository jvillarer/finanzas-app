"use client";

import { useState } from "react";
import { crearTransaccion } from "@/lib/transacciones";

const CATEGORIAS = [
  { nombre: "Comida",          emoji: "🍽", color: "#FF6B35" },
  { nombre: "Supermercado",    emoji: "🛒", color: "#00C896" },
  { nombre: "Transporte",      emoji: "🚗", color: "#4FACFE" },
  { nombre: "Entretenimiento", emoji: "🎬", color: "#A855F7" },
  { nombre: "Salud",           emoji: "💊", color: "#FF4D6D" },
  { nombre: "Servicios",       emoji: "⚡", color: "#F59E0B" },
  { nombre: "Ropa",            emoji: "👕", color: "#EC4899" },
  { nombre: "Hogar",           emoji: "🏠", color: "#14B8A6" },
  { nombre: "Educación",       emoji: "📚", color: "#6366F1" },
  { nombre: "Otros",           emoji: "📦", color: "#94A3B8" },
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
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    if (!fecha) {
      setError("Selecciona una fecha");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await crearTransaccion({ monto: Number(monto), descripcion, categoria, tipo, fecha });
      onGuardado();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(16,12,40,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className="w-full bg-white pt-6 pb-10 px-5 slide-up"
        style={{ borderTopLeftRadius: "2rem", borderTopRightRadius: "2rem", maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: "#E5E7EB" }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: "#100C28" }}>Nuevo movimiento</h2>
          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 active:scale-95 transition-transform"
            style={{ backgroundColor: "#F4F3FA" }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Tipo toggle */}
        <div className="flex gap-2 mb-6 p-1 rounded-2xl" style={{ backgroundColor: "#F4F3FA" }}>
          {(["gasto", "ingreso"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
              style={{
                backgroundColor: tipo === t ? (t === "ingreso" ? "#00C896" : "#534AB7") : "transparent",
                color: tipo === t ? "white" : "#9CA3AF",
              }}
            >
              {t === "ingreso" ? "💰 Ingreso" : "💸 Gasto"}
            </button>
          ))}
        </div>

        {/* Monto (grande, centrado) */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9CA3AF" }}>
            Monto
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold" style={{ color: "#100C28" }}>$</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-2xl pl-9 pr-4 py-4 text-2xl font-bold outline-none"
              style={{ backgroundColor: "#F4F3FA", color: "#100C28" }}
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9CA3AF" }}>
            Descripción (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej. Súper, gasolina, Netflix..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none"
            style={{ backgroundColor: "#F4F3FA", color: "#100C28" }}
          />
        </div>

        {/* Categorías como chips visuales */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#9CA3AF" }}>
            Categoría
          </label>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIAS.map((cat) => {
              const activa = categoria === cat.nombre;
              return (
                <button
                  key={cat.nombre}
                  onClick={() => setCategoria(activa ? "" : cat.nombre)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
                  style={{
                    backgroundColor: activa ? cat.color + "20" : "#F4F3FA",
                    border: activa ? `2px solid ${cat.color}` : "2px solid transparent",
                  }}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span
                    className="text-[9px] font-bold leading-none"
                    style={{ color: activa ? cat.color : "#9CA3AF" }}
                  >
                    {cat.nombre.length > 6 ? cat.nombre.slice(0, 6) + "…" : cat.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fecha */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9CA3AF" }}>
            Fecha
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none"
            style={{ backgroundColor: "#F4F3FA", color: "#100C28" }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-2.5 mb-4" style={{ backgroundColor: "#FFF1F2" }}>
            <span style={{ color: "#FF4D6D" }}>⚠</span>
            <p className="text-xs font-semibold" style={{ color: "#FF4D6D" }}>{error}</p>
          </div>
        )}

        {/* Guardar */}
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all active:scale-[0.98] text-sm tracking-wide"
          style={{
            backgroundColor: "#534AB7",
            boxShadow: "0 8px 24px rgba(83,74,183,0.35)",
          }}
        >
          {guardando ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
              Guardando...
            </span>
          ) : "Guardar movimiento"}
        </button>
      </div>
    </div>
  );
}
