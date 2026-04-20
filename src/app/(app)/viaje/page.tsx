"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

interface Viaje {
  id: string;
  nombre: string;
  moneda: string;
  presupuesto: number | null;
  tipo_cambio: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
}

interface Transaccion {
  id: string;
  monto: number;
  monto_original: number | null;
  moneda: string | null;
  descripcion: string;
  categoria: string;
  tipo: string;
  fecha: string;
}

const SIMBOLOS: Record<string, string> = { MXN: "$", USD: "US$", EUR: "€" };

export default function ViajePage() {
  const [viajeActivo, setViajeActivo] = useState<Viaje | null>(null);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Formulario
  const [nombre, setNombre] = useState("");
  const [moneda, setMoneda] = useState("USD");
  const [presupuesto, setPresupuesto] = useState("");
  const [tipoCambio, setTipoCambio] = useState("17.5");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const supabase = createClient();
    const { data: viaje } = await supabase
      .from("viajes").select("*").eq("activo", true).single();
    setViajeActivo(viaje || null);
    if (viaje) {
      const { data: txs } = await supabase
        .from("transacciones")
        .select("id, monto, monto_original, moneda, descripcion, categoria, tipo, fecha")
        .eq("viaje_id", viaje.id)
        .order("fecha", { ascending: false });
      setTransacciones(txs || []);
    }
    setCargando(false);
  };

  const crearViaje = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const supabase = createClient();
    const { error } = await supabase.from("viajes").insert({
      nombre: nombre.trim(),
      moneda,
      presupuesto: presupuesto ? Number(presupuesto) : null,
      tipo_cambio: Number(tipoCambio) || 17.5,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      activo: true,
    });
    if (!error) { setCreando(false); await cargarDatos(); }
    setGuardando(false);
  };

  const terminarViaje = async () => {
    if (!viajeActivo) return;
    const supabase = createClient();
    await supabase.from("viajes").update({ activo: false }).eq("id", viajeActivo.id);
    setViajeActivo(null);
    setTransacciones([]);
  };

  const gastosTotales = transacciones
    .filter(t => t.tipo === "gasto")
    .reduce((s, t) => {
      if (viajeActivo?.moneda !== "MXN" && t.monto_original != null) return s + Number(t.monto_original);
      return s + Number(t.monto);
    }, 0);

  const simbolo = viajeActivo ? (SIMBOLOS[viajeActivo.moneda] || "$") : "$";
  const presupuestoNum = viajeActivo?.presupuesto || 0;
  const pctGastado = presupuestoNum > 0 ? Math.min((gastosTotales / presupuestoNum) * 100, 100) : 0;
  const restante = Math.max(0, presupuestoNum - gastosTotales);

  const inputStyle = {
    backgroundColor: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text-1)",
  };

  if (cargando) return (
    <main className="min-h-screen px-5 pt-14 pb-28" style={{ backgroundColor: "var(--bg)" }}>
      <p className="text-center text-sm mt-20" style={{ color: "var(--text-3)" }}>Cargando...</p>
    </main>
  );

  return (
    <main className="min-h-screen px-5 pt-14 pb-28" style={{ backgroundColor: "var(--bg)" }}>
      <h1 className="text-xl font-bold mb-6" style={{ color: "var(--text-1)" }}>✈️ Modo Viaje</h1>

      {/* Sin viaje activo */}
      {!viajeActivo && !creando && (
        <div className="rounded-2xl p-8 text-center mb-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-4xl mb-3">✈️</p>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Sin viaje activo</p>
          <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--text-3)" }}>
            Activa el modo viaje para separar tus gastos,{"\n"}ver cuánto llevas en dólares y controlar tu presupuesto
          </p>
          <button onClick={() => setCreando(true)}
            className="px-6 py-3 rounded-xl text-sm font-bold"
            style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}>
            Crear viaje
          </button>
        </div>
      )}

      {/* Formulario nuevo viaje */}
      {creando && (
        <div className="rounded-2xl p-5 mb-4 space-y-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Nuevo viaje</p>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Nombre del viaje</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej. USA 2026, Europa mayo..."
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={inputStyle} />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Moneda</label>
            <div className="flex gap-2">
              {["USD", "EUR", "MXN"].map(m => (
                <button key={m} type="button" onClick={() => setMoneda(m)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    backgroundColor: moneda === m ? "var(--gold-dim)" : "var(--surface-2)",
                    border: moneda === m ? "1px solid var(--gold-border)" : "1px solid transparent",
                    color: moneda === m ? "var(--gold)" : "var(--text-2)",
                  }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {moneda !== "MXN" && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Tipo de cambio (1 {moneda} = ? MXN)</label>
              <input type="number" inputMode="decimal" value={tipoCambio} onChange={e => setTipoCambio(e.target.value)}
                placeholder="17.50"
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                style={inputStyle} />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Presupuesto en {moneda} — opcional</label>
            <input type="number" inputMode="decimal" value={presupuesto} onChange={e => setPresupuesto(e.target.value)}
              placeholder={moneda === "USD" ? "Ej. 1500" : "Ej. 25000"}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Regreso</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                style={inputStyle} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setCreando(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              Cancelar
            </button>
            <button onClick={crearViaje} disabled={guardando || !nombre.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}>
              {guardando ? "Creando..." : "Activar viaje ✈️"}
            </button>
          </div>
        </div>
      )}

      {/* Viaje activo */}
      {viajeActivo && (
        <>
          <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-base font-bold" style={{ color: "var(--text-1)" }}>✈️ {viajeActivo.nombre}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  {viajeActivo.moneda !== "MXN"
                    ? `1 ${viajeActivo.moneda} = $${viajeActivo.tipo_cambio} MXN`
                    : "Pesos mexicanos"}
                  {viajeActivo.fecha_inicio ? ` · ${viajeActivo.fecha_inicio}` : ""}
                  {viajeActivo.fecha_fin ? ` → ${viajeActivo.fecha_fin}` : ""}
                </p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full font-bold"
                style={{ backgroundColor: "rgba(50,200,100,0.15)", color: "var(--success)" }}>
                ACTIVO
              </span>
            </div>

            {/* Total gastado */}
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-3)" }}>Total gastado</p>
              <p className="text-4xl font-bold font-number" style={{ color: "var(--text-1)" }}>
                {simbolo}{gastosTotales.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
              {presupuestoNum > 0 && (
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                  de {simbolo}{presupuestoNum.toLocaleString("es-MX")} presupuestados
                </p>
              )}
            </div>

            {/* Barra de presupuesto */}
            {presupuestoNum > 0 && (
              <div className="mb-4">
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pctGastado}%`,
                      backgroundColor: pctGastado >= 90 ? "var(--danger)" : pctGastado >= 70 ? "#f59e0b" : "var(--success)",
                    }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <p className="text-[10px] font-number" style={{ color: "var(--text-3)" }}>{pctGastado.toFixed(0)}% usado</p>
                  <p className="text-[10px] font-number" style={{ color: pctGastado >= 90 ? "var(--danger)" : "var(--success)" }}>
                    Te quedan {simbolo}{restante.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            )}

            <button onClick={terminarViaje}
              className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              Terminar viaje
            </button>
          </div>

          {/* Tip */}
          <div className="rounded-xl px-4 py-3 mb-4 text-xs leading-relaxed"
            style={{ backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)", color: "var(--gold)" }}>
            💬 Dile a Lani <strong>"starbucks 8"</strong> y lo anota como {viajeActivo.moneda === "MXN" ? "pesos" : `${viajeActivo.moneda}`} en este viaje automáticamente
          </div>

          {/* Lista de transacciones */}
          {transacciones.length > 0 ? (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="px-5 py-3.5 text-sm font-bold" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>
                Movimientos del viaje
              </p>
              {transacciones.map((tx) => {
                const montoMostrar = viajeActivo.moneda !== "MXN" && tx.monto_original != null
                  ? `${simbolo}${Number(tx.monto_original).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                  : `$${Number(tx.monto).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                return (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: "1px solid var(--border-2)" }}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>{tx.descripcion}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{tx.categoria} · {tx.fecha}</p>
                    </div>
                    <p className="text-sm font-bold font-number shrink-0"
                      style={{ color: tx.tipo === "gasto" ? "var(--danger)" : "var(--success)" }}>
                      {tx.tipo === "gasto" ? "-" : "+"}{montoMostrar}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                Aún no hay gastos en este viaje.
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
