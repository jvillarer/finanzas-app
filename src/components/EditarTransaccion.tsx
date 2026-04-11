"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Transaccion } from "@/lib/supabase";

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
  transaccion: Transaccion;
  onCerrar: () => void;
  onGuardado: () => void;
  onEliminado: () => void;
}

export default function EditarTransaccion({ transaccion, onCerrar, onGuardado, onEliminado }: Props) {
  const [tipo, setTipo] = useState<"ingreso" | "gasto">(transaccion.tipo);
  const [monto, setMonto] = useState(String(transaccion.monto));
  const [descripcion, setDescripcion] = useState(transaccion.descripcion || "");
  const [categoria, setCategoria] = useState(transaccion.categoria || "");
  const [fecha, setFecha] = useState(transaccion.fecha);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      setError("Ingresa un monto válido"); return;
    }
    setGuardando(true); setError("");
    const supabase = createClient();
    const { error } = await supabase
      .from("transacciones")
      .update({ monto: Number(monto), descripcion, categoria, tipo, fecha })
      .eq("id", transaccion.id);
    if (error) { setError("Error al guardar"); setGuardando(false); return; }
    onGuardado();
  };

  const handleEliminar = async () => {
    setEliminando(true);
    const supabase = createClient();
    await supabase.from("transacciones").delete().eq("id", transaccion.id);
    onEliminado();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className="w-full pt-5 pb-10 px-5 slide-up bg-white"
        style={{
          borderTopLeftRadius: "2rem",
          borderTopRightRadius: "2rem",
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-6 bg-gray-200" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-gray-900">Editar movimiento</h2>
          <button onClick={onCerrar} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="#6b7280" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tipo */}
        <div className="flex gap-2 mb-6 p-1 rounded-2xl bg-gray-100">
          {(["gasto", "ingreso"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                backgroundColor: tipo === t ? "#000" : "transparent",
                color: tipo === t ? "#fff" : "#6b7280",
              }}
            >
              {t === "ingreso" ? "💰 Ingreso" : "💸 Gasto"}
            </button>
          ))}
        </div>

        {/* Monto */}
        <div className="mb-5">
          <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-gray-400">Monto</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-900">$</span>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={monto} onChange={(e) => setMonto(e.target.value)}
              className="w-full rounded-2xl pl-9 pr-4 py-4 text-2xl font-black outline-none text-gray-900"
              style={{ backgroundColor: "#f5f5f5", border: "1.5px solid rgba(0,0,0,0.08)" }}
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-5">
          <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-gray-400">Descripción</label>
          <input
            type="text" placeholder="Ej. Súper, gasolina..."
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none text-gray-900 placeholder-gray-300"
            style={{ backgroundColor: "#f5f5f5", border: "1.5px solid rgba(0,0,0,0.08)" }}
          />
        </div>

        {/* Categorías */}
        <div className="mb-5">
          <label className="block text-xs font-bold tracking-widest uppercase mb-3 text-gray-400">Categoría</label>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORIAS.map((cat) => {
              const activa = categoria === cat.nombre;
              return (
                <button
                  key={cat.nombre}
                  onClick={() => setCategoria(activa ? "" : cat.nombre)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95"
                  style={{
                    backgroundColor: activa ? "#000" : "#f5f5f5",
                    border: activa ? "2px solid #000" : "2px solid transparent",
                  }}
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[9px] font-bold" style={{ color: activa ? "#fff" : "#6b7280" }}>
                    {cat.nombre.length > 6 ? cat.nombre.slice(0, 6) + "…" : cat.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fecha */}
        <div className="mb-6">
          <label className="block text-xs font-bold tracking-widest uppercase mb-2 text-gray-400">Fecha</label>
          <input
            type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none text-gray-900"
            style={{ backgroundColor: "#f5f5f5", border: "1.5px solid rgba(0,0,0,0.08)" }}
          />
        </div>

        {error && <p className="text-xs font-semibold mb-4 text-red-500">{error}</p>}

        {/* Guardar */}
        <button
          onClick={handleGuardar} disabled={guardando}
          className="w-full font-bold py-4 rounded-full disabled:opacity-40 transition-all active:scale-[0.98] text-sm mb-3 bg-black text-white"
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>

        {/* Eliminar */}
        {!confirmarEliminar ? (
          <button
            onClick={() => setConfirmarEliminar(true)}
            className="w-full font-bold py-4 rounded-full text-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#fff1f2", color: "#dc2626" }}
          >
            Eliminar movimiento
          </button>
        ) : (
          <div className="rounded-2xl p-4 bg-red-50 border border-red-100">
            <p className="text-sm font-bold text-gray-900 mb-3 text-center">¿Eliminar este movimiento?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmarEliminar(false)}
                className="flex-1 py-3 rounded-full text-sm font-bold bg-gray-100 text-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar} disabled={eliminando}
                className="flex-1 py-3 rounded-full text-sm font-bold disabled:opacity-40 bg-red-500 text-white"
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
