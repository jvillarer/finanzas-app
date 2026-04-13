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
    if (!categoria) { setError("Selecciona una categoría"); return; }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaDate = new Date(fecha + "T00:00:00");
    if (isNaN(fechaDate.getTime())) { setError("Fecha inválida"); return; }
    if (fechaDate > hoy) { setError("La fecha no puede ser futura"); return; }
    if (fechaDate.getFullYear() < 2000) { setError("Fecha demasiado antigua"); return; }
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
          <h2 className="text-base font-bold" style={{ color: "var(--text-1)" }}>Editar movimiento</h2>
          <button
            onClick={onCerrar}
            className="w-7 h-7 rounded-full flex items-center justify-center"
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
              style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
            />
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-5">
          {label("Descripción")}
          <input
            type="text" placeholder="Ej. Súper, gasolina..."
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-xl px-4 py-3.5 text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
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
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
          />
        </div>

        {error && <p className="text-xs font-semibold mb-4" style={{ color: "var(--danger)" }}>{error}</p>}

        <button
          onClick={handleGuardar} disabled={guardando}
          className="w-full font-bold py-3.5 rounded-xl disabled:opacity-40 transition-all active:scale-[0.98] text-sm mb-3"
          style={{ backgroundColor: "var(--gold)", color: "#0c0c0e" }}
        >
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>

        {!confirmarEliminar ? (
          <button
            onClick={() => setConfirmarEliminar(true)}
            className="w-full font-semibold py-3.5 rounded-xl text-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: "var(--danger-dim)", color: "var(--danger)", border: "1px solid rgba(240,110,110,0.15)" }}
          >
            Eliminar movimiento
          </button>
        ) : (
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
            <p className="text-sm font-bold mb-3 text-center" style={{ color: "var(--text-1)" }}>¿Eliminar?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmarEliminar(false)}
                className="flex-1 py-3 rounded-xl text-xs font-bold"
                style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar} disabled={eliminando}
                className="flex-1 py-3 rounded-xl text-xs font-bold disabled:opacity-40"
                style={{ backgroundColor: "var(--danger)", color: "#fff" }}
              >
                {eliminando ? "..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
