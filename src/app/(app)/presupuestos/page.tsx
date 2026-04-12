"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { obtenerTransacciones, formatearMonto } from "@/lib/transacciones";
import { verificarPresupuestos } from "@/lib/notificaciones";

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

interface Presupuesto {
  id?: string;
  categoria: string;
  limite: number;
}

interface PresupuestoConGasto extends Presupuesto {
  gastado: number;
  pct: number;
  emoji: string;
}

function ModalPresupuesto({
  categoria, emoji, limiteActual, onGuardar, onEliminar, onCerrar,
}: {
  categoria: string; emoji: string; limiteActual?: number;
  onGuardar: (limite: number) => void; onEliminar?: () => void; onCerrar: () => void;
}) {
  const [valor, setValor] = useState(limiteActual ? String(limiteActual) : "");
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className="w-full px-5 pt-5 pb-10 slide-up bg-white"
        style={{
          borderTopLeftRadius: "2rem",
          borderTopRightRadius: "2rem",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: "#e4e3de" }} />
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: "var(--accent-light)" }}
          >
            {emoji}
          </div>
          <div>
            <p className="text-lg font-black" style={{ color: "var(--text-1)" }}>{categoria}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Límite mensual</p>
          </div>
        </div>

        <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text-3)" }}>Monto límite</label>
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold" style={{ color: "var(--text-1)" }}>$</span>
          <input
            type="number" inputMode="decimal" placeholder="0.00"
            value={valor} onChange={(e) => setValor(e.target.value)} autoFocus
            className="w-full rounded-2xl pl-9 pr-4 py-4 text-2xl font-black outline-none font-number"
            style={{
              backgroundColor: "var(--surface-2)",
              border: "1.5px solid rgba(0,0,0,0.06)",
              color: "var(--text-1)",
            }}
          />
        </div>

        <button
          onClick={() => { if (Number(valor) > 0) onGuardar(Number(valor)); }}
          className="w-full font-bold py-4 rounded-full text-sm mb-3 text-white"
          style={{ backgroundColor: "var(--text-1)" }}
        >
          Guardar presupuesto
        </button>

        {onEliminar && (
          <button
            onClick={onEliminar}
            className="w-full font-bold py-4 rounded-full text-sm"
            style={{ backgroundColor: "#fff1f2", color: "#dc2626" }}
          >
            Quitar presupuesto
          </button>
        )}
      </div>
    </div>
  );
}

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [gastosPorCat, setGastosPorCat] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<{ categoria: string; emoji: string; limiteActual?: number; id?: string } | null>(null);

  const cargar = async () => {
    setCargando(true);
    const supabase = createClient();

    const [{ data: presData }, txs] = await Promise.all([
      supabase.from("presupuestos").select("*"),
      obtenerTransacciones(),
    ]);

    setPresupuestos(presData || []);

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const gastados: Record<string, number> = {};
    txs
      .filter((t) => t.tipo === "gasto" && new Date(t.fecha + "T12:00:00") >= inicioMes)
      .forEach((t) => {
        const cat = t.categoria || "Otros";
        gastados[cat] = (gastados[cat] || 0) + t.monto;
      });
    setGastosPorCat(gastados);
    if (presData && presData.length > 0) {
      verificarPresupuestos(presData, gastados);
    }
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardarPresupuesto = async (categoria: string, limite: number) => {
    const supabase = createClient();
    const existe = presupuestos.find((p) => p.categoria === categoria);
    if (existe?.id) {
      await supabase.from("presupuestos").update({ limite }).eq("id", existe.id);
    } else {
      await supabase.from("presupuestos").insert([{ categoria, limite }]);
    }
    setModal(null);
    cargar();
  };

  const eliminarPresupuesto = async (id: string) => {
    const supabase = createClient();
    await supabase.from("presupuestos").delete().eq("id", id);
    setModal(null);
    cargar();
  };

  const conDatos: PresupuestoConGasto[] = CATEGORIAS.map((cat) => {
    const p = presupuestos.find((x) => x.categoria === cat.nombre);
    const gastado = gastosPorCat[cat.nombre] || 0;
    const limite = p?.limite || 0;
    const pct = limite > 0 ? Math.min((gastado / limite) * 100, 100) : 0;
    return { id: p?.id, categoria: cat.nombre, emoji: cat.emoji, limite, gastado, pct };
  });

  const conPresupuesto = conDatos.filter((c) => c.limite > 0);
  const sinPresupuesto = conDatos.filter((c) => c.limite === 0);

  const mesLabel = (() => {
    const m = new Date().toLocaleString("es-MX", { month: "long" });
    return m.charAt(0).toUpperCase() + m.slice(1);
  })();

  return (
    <main className="min-h-screen px-4 pt-14 pb-10" style={{ backgroundColor: "var(--bg)" }}>
      <div className="mb-7">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>Presupuestos</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>{mesLabel} — define tus límites</p>
      </div>

      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl h-20 skeleton" />
          ))}
        </div>
      ) : (
        <>
          {/* Con presupuesto */}
          {conPresupuesto.length > 0 && (
            <div className="space-y-3 mb-6">
              {conPresupuesto.map((cat) => {
                const pasado = cat.gastado > cat.limite;
                const cerca = cat.pct >= 80 && !pasado;
                const color = pasado ? "#dc2626" : cerca ? "#d97706" : "var(--accent)";
                const bgColor = pasado ? "#fff1f2" : cerca ? "#fffbeb" : "var(--accent-light)";

                return (
                  <button
                    key={cat.categoria}
                    onClick={() => setModal({ categoria: cat.categoria, emoji: cat.emoji, limiteActual: cat.limite, id: cat.id })}
                    className="w-full rounded-3xl p-4 text-left transition-all active:scale-[0.98] bg-white"
                    style={{ boxShadow: "var(--shadow-md)" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: bgColor }}
                      >
                        {cat.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{cat.categoria}</p>
                        <p className="text-xs font-number" style={{ color: "var(--text-3)" }}>
                          {formatearMonto(cat.gastado)} de {formatearMonto(cat.limite)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black font-number" style={{ color }}>
                          {cat.pct.toFixed(0)}%
                        </p>
                        {pasado && <p className="text-[10px] font-bold text-red-500">Excedido</p>}
                        {cerca && <p className="text-[10px] font-bold text-amber-500">Casi</p>}
                      </div>
                    </div>

                    {/* Barra */}
                    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--surface-2)" }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${cat.pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sin presupuesto */}
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-3)" }}>
            {conPresupuesto.length > 0 ? "Agregar más" : "Elige una categoría"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sinPresupuesto.map((cat) => (
              <button
                key={cat.categoria}
                onClick={() => setModal({ categoria: cat.categoria, emoji: cat.emoji })}
                className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.97] bg-white"
                style={{
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                <span className="text-xl">{cat.emoji}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{cat.categoria}</p>
                  <p className="text-[10px] font-semibold" style={{ color: "var(--text-3)" }}>Sin límite</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {modal && (
        <ModalPresupuesto
          categoria={modal.categoria}
          emoji={modal.emoji}
          limiteActual={modal.limiteActual}
          onGuardar={(limite) => guardarPresupuesto(modal.categoria, limite)}
          onEliminar={modal.id ? () => eliminarPresupuesto(modal.id!) : undefined}
          onCerrar={() => setModal(null)}
        />
      )}
    </main>
  );
}
