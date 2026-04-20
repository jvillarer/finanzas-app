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

interface Presupuesto { id?: string; categoria: string; limite: number; }
interface PresupuestoConGasto extends Presupuesto { gastado: number; pct: number; emoji: string; }

function ModalPresupuesto({ categoria, emoji, limiteActual, onGuardar, onEliminar, onCerrar }: {
  categoria: string; emoji: string; limiteActual?: number;
  onGuardar: (limite: number) => void; onEliminar?: () => void; onCerrar: () => void;
}) {
  const [valor, setValor] = useState(limiteActual ? String(limiteActual) : "");
  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className="w-full px-5 pt-4 pb-10 slide-up"
        style={{
          backgroundColor: "var(--surface)",
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="w-8 h-0.5 rounded-full mx-auto mb-5" style={{ backgroundColor: "var(--surface-3)" }} />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: "var(--surface-2)" }}>
            {emoji}
          </div>
          <div>
            <p className="text-base font-bold" style={{ color: "var(--text-1)" }}>{categoria}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Límite mensual</p>
          </div>
        </div>

        <label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-3)" }}>Monto límite</label>
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: "var(--text-3)" }}>$</span>
          <input
            type="number" inputMode="decimal" placeholder="0.00"
            value={valor} onChange={(e) => setValor(e.target.value)} autoFocus
            className="w-full rounded-xl pl-8 pr-4 py-3.5 text-2xl font-black outline-none font-number"
            style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
          />
        </div>

        <button
          onClick={() => { if (Number(valor) > 0) onGuardar(Number(valor)); }}
          className="w-full font-bold py-3.5 rounded-xl text-sm mb-3"
          style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}
        >
          Guardar presupuesto
        </button>

        {onEliminar && (
          <button onClick={onEliminar} className="w-full font-semibold py-3.5 rounded-xl text-sm"
            style={{ backgroundColor: "var(--danger-dim)", color: "var(--danger)", border: "1px solid rgba(240,110,110,0.15)" }}>
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
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const gastados: Record<string, number> = {};
    txs.filter((t) => t.tipo === "gasto" && new Date(t.fecha + "T12:00:00") >= inicioMes)
       .forEach((t) => { const cat = t.categoria || "Otros"; gastados[cat] = (gastados[cat] || 0) + t.monto; });
    setGastosPorCat(gastados);
    if (presData && presData.length > 0) verificarPresupuestos(presData, gastados);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardarPresupuesto = async (categoria: string, limite: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const existe = presupuestos.find((p) => p.categoria === categoria);
    if (existe?.id) {
      await supabase.from("presupuestos").update({ limite }).eq("id", existe.id);
    } else {
      await supabase.from("presupuestos").insert([{ categoria, limite, usuario_id: user?.id }]);
    }
    setModal(null); cargar();
  };

  const eliminarPresupuesto = async (id: string) => {
    const supabase = createClient();
    await supabase.from("presupuestos").delete().eq("id", id);
    setModal(null); cargar();
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

  const totalGastado = conPresupuesto.reduce((s, c) => s + c.gastado, 0);
  const totalLimite = conPresupuesto.reduce((s, c) => s + c.limite, 0);

  return (
    <main className="min-h-screen px-5 pt-14 pb-28" style={{ backgroundColor: "var(--bg)" }}>

      {/* Header */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>{mesLabel}</p>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>Presupuestos</h1>
      </div>

      {/* Resumen total */}
      {!cargando && conPresupuesto.length > 0 && (
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>Total comprometido</p>
            <p className="text-xs font-number" style={{ color: "var(--text-3)" }}>
              {formatearMonto(totalGastado)} / {formatearMonto(totalLimite)}
            </p>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--surface-3)" }}>
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{
                width: `${totalLimite > 0 ? Math.min((totalGastado / totalLimite) * 100, 100) : 0}%`,
                backgroundColor: "var(--gold)",
              }}
            />
          </div>
        </div>
      )}

      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton rounded-2xl" style={{ height: 76 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Con presupuesto */}
          {conPresupuesto.length > 0 && (
            <div className="space-y-2 mb-8">
              {conPresupuesto.map((cat) => {
                const pasado = cat.gastado > cat.limite;
                const cerca = cat.pct >= 80 && !pasado;
                const barColor = pasado ? "var(--danger)" : cerca ? "var(--warning)" : "var(--gold)";

                return (
                  <button
                    key={cat.categoria}
                    onClick={() => setModal({ categoria: cat.categoria, emoji: cat.emoji, limiteActual: cat.limite, id: cat.id })}
                    className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98]"
                    style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: "var(--surface-2)" }}>
                        {cat.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{cat.categoria}</p>
                        <p className="text-xs font-number mt-0.5" style={{ color: "var(--text-3)" }}>
                          {formatearMonto(cat.gastado)} de {formatearMonto(cat.limite)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-number" style={{ color: barColor }}>
                          {cat.pct.toFixed(0)}%
                        </p>
                        {pasado && <p className="text-[9px] font-bold mt-0.5" style={{ color: "var(--danger)" }}>Excedido</p>}
                        {cerca && <p className="text-[9px] font-bold mt-0.5" style={{ color: "var(--warning)" }}>Casi</p>}
                      </div>
                    </div>
                    <div className="w-full rounded-full h-1" style={{ backgroundColor: "var(--surface-3)" }}>
                      <div className="h-1 rounded-full transition-all duration-500"
                        style={{ width: `${cat.pct}%`, backgroundColor: barColor }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sin presupuesto */}
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
            {conPresupuesto.length > 0 ? "Agregar categoría" : "Elige una categoría para empezar"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sinPresupuesto.map((cat) => (
              <button
                key={cat.categoria}
                onClick={() => setModal({ categoria: cat.categoria, emoji: cat.emoji })}
                className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.97]"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <span className="text-xl">{cat.emoji}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{cat.categoria}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-3)" }}>Sin límite</p>
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
