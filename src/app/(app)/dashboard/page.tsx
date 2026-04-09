"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";
import NuevaTransaccion from "@/components/NuevaTransaccion";
import { createClient } from "@/lib/supabase";

const CAT_CONFIG: Record<string, { color: string; emoji: string }> = {
  Comida:          { color: "#FF6B35", emoji: "🍽" },
  Supermercado:    { color: "#00C896", emoji: "🛒" },
  Transporte:      { color: "#4FACFE", emoji: "🚗" },
  Entretenimiento: { color: "#A855F7", emoji: "🎬" },
  Salud:           { color: "#FF4D6D", emoji: "💊" },
  Servicios:       { color: "#F59E0B", emoji: "⚡" },
  Ropa:            { color: "#EC4899", emoji: "👕" },
  Hogar:           { color: "#14B8A6", emoji: "🏠" },
  Educación:       { color: "#6366F1", emoji: "📚" },
  Otros:           { color: "#94A3B8", emoji: "📦" },
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-100 rounded-full w-1/2" />
        <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
      </div>
      <div className="h-4 bg-gray-100 rounded-full w-16" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombre, setNombre] = useState("");

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const cargar = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.nombre_completo) {
        setNombre(user.user_metadata.nombre_completo.split(" ")[0]);
      }
      const datos = await obtenerTransacciones();
      setTransacciones(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const { ingresos, gastos, balance } = calcularResumen(transacciones);
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const mesActual = new Date().toLocaleString("es-MX", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F8F7FC" }}>

      {/* ── DARK HEADER ── */}
      <div style={{ backgroundColor: "#100C28" }} className="px-5 pt-14 pb-8">

        {/* Saludo + logout */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
              {saludo}
            </p>
            <h1 className="text-white text-xl font-bold mt-0.5 tracking-tight">
              {nombre ? nombre : "Mi cuenta"}
            </h1>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            aria-label="Cerrar sesión"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-5 h-5" style={{ opacity: 0.6 }} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>

        {/* Balance total */}
        <div className="mb-7">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
            Balance total
          </p>
          {cargando ? (
            <div className="h-14 w-52 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.1)" }} />
          ) : (
            <p
              className="text-5xl font-bold tracking-tight tabular-nums"
              style={{ color: balance >= 0 ? "#FFFFFF" : "#FF6B6B" }}
            >
              {formatearMonto(balance)}
            </p>
          )}
        </div>

        {/* Virtual card */}
        <div
          className="rounded-3xl p-5 overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #534AB7 0%, #6C5DD3 50%, #9B8FE8 100%)" }}
        >
          {/* Decorativos */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 160, height: 160, top: -40, right: -40, background: "rgba(255,255,255,0.07)" }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 200, height: 200, bottom: -60, left: -60, background: "rgba(0,0,0,0.1)" }}
          />

          <div className="relative">
            {/* Card header */}
            <div className="flex justify-between items-start mb-7">
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Periodo actual
                </p>
                <p className="text-white text-sm font-bold capitalize">{mesActual}</p>
              </div>
              {/* Overlapping circles (card brand) */}
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
                <div className="w-8 h-8 rounded-full -ml-3" style={{ background: "rgba(255,255,255,0.15)" }} />
              </div>
            </div>

            {/* Stats */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Gastos
                </p>
                <p className="text-white text-xl font-bold tabular-nums">
                  {cargando
                    ? <span className="inline-block w-20 h-6 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.2)" }} />
                    : formatearMonto(gastos)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Ingresos
                </p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#6EFACC" }}>
                  {cargando
                    ? <span className="inline-block w-20 h-6 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.2)" }} />
                    : formatearMonto(ingresos)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY CLARO ── */}
      <div className="rounded-t-[2rem] -mt-4 pt-7 pb-40" style={{ backgroundColor: "#F8F7FC" }}>

        {/* Header sección */}
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-base font-bold" style={{ color: "#100C28" }}>Movimientos</h2>
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center gap-1.5 text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform"
            style={{ backgroundColor: "#100C28" }}
          >
            <span className="text-sm leading-none">+</span> Agregar
          </button>
        </div>

        {/* Lista */}
        <div className="mx-4 bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 2px 24px rgba(16,12,40,0.06)" }}>
          {cargando ? (
            <>{[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}</>
          ) : transacciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 text-2xl" style={{ backgroundColor: "#EEEdf9" }}>
                💳
              </div>
              <p className="font-bold text-sm mb-1" style={{ color: "#100C28" }}>Sin movimientos aún</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Agrega tu primer movimiento con el botón de arriba
              </p>
            </div>
          ) : (
            <ul>
              {transacciones.slice(0, 25).map((t, idx) => {
                const cfg = t.tipo === "ingreso"
                  ? { color: "#00C896", emoji: "💰" }
                  : (CAT_CONFIG[t.categoria || ""] || CAT_CONFIG["Otros"]);
                const esUltimo = idx === Math.min(transacciones.length, 25) - 1;

                return (
                  <li
                    key={t.id}
                    className={`flex items-center gap-4 px-5 py-4 ${!esUltimo ? "border-b border-gray-50" : ""}`}
                  >
                    {/* Icono */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl"
                      style={{ backgroundColor: cfg.color + "18" }}
                    >
                      {cfg.emoji}
                    </div>

                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#100C28" }}>
                        {t.descripcion || t.categoria || "Sin descripción"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        {t.categoria ? ` · ${t.categoria}` : ""}
                      </p>
                    </div>

                    {/* Monto */}
                    <p
                      className="text-sm font-bold tabular-nums shrink-0"
                      style={{ color: t.tipo === "ingreso" ? "#00C896" : "#100C28" }}
                    >
                      {t.tipo === "ingreso" ? "+" : "−"}{formatearMonto(t.monto)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setMostrarFormulario(true)}
        className="fixed bottom-28 right-5 w-14 h-14 text-white rounded-2xl flex items-center justify-center text-2xl font-light active:scale-95 transition-transform"
        style={{ backgroundColor: "#534AB7", boxShadow: "0 8px 24px rgba(83,74,183,0.45)" }}
        aria-label="Nueva transacción"
      >
        +
      </button>

      {mostrarFormulario && (
        <NuevaTransaccion
          onCerrar={() => setMostrarFormulario(false)}
          onGuardado={() => { setMostrarFormulario(false); cargar(); }}
        />
      )}
    </main>
  );
}
