"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";
import NuevaTransaccion from "@/components/NuevaTransaccion";
import { createClient } from "@/lib/supabase";

// Paleta de colores por categoría
const CAT_CONFIG: Record<string, { bg: string; text: string; emoji: string }> = {
  Comida:          { bg: "bg-orange-100",  text: "text-orange-600",  emoji: "🍽" },
  Supermercado:    { bg: "bg-emerald-100", text: "text-emerald-600", emoji: "🛒" },
  Transporte:      { bg: "bg-blue-100",    text: "text-blue-600",    emoji: "🚗" },
  Entretenimiento: { bg: "bg-violet-100",  text: "text-violet-600",  emoji: "🎬" },
  Salud:           { bg: "bg-rose-100",    text: "text-rose-600",    emoji: "💊" },
  Servicios:       { bg: "bg-amber-100",   text: "text-amber-600",   emoji: "⚡" },
  Ropa:            { bg: "bg-pink-100",    text: "text-pink-600",    emoji: "👕" },
  Hogar:           { bg: "bg-teal-100",    text: "text-teal-600",    emoji: "🏠" },
  Educación:       { bg: "bg-indigo-100",  text: "text-indigo-600",  emoji: "📚" },
  Otros:           { bg: "bg-slate-100",   text: "text-slate-500",   emoji: "📦" },
};

const INGRESO_CONFIG = { bg: "bg-emerald-100", text: "text-emerald-600", emoji: "💰" };

function CategoriaIcono({ categoria, tipo }: { categoria: string; tipo: string }) {
  const cfg = tipo === "ingreso" ? INGRESO_CONFIG : (CAT_CONFIG[categoria] || CAT_CONFIG["Otros"]);
  return (
    <div className={`w-11 h-11 rounded-2xl ${cfg.bg} flex items-center justify-center shrink-0 text-lg`}>
      {cfg.emoji}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 animate-pulse">
      <div className="w-11 h-11 rounded-2xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full w-2/3" />
        <div className="h-2.5 bg-gray-100 rounded-full w-1/3" />
      </div>
      <div className="h-3 bg-gray-100 rounded-full w-16" />
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

  const mesActual = new Date().toLocaleString("es-MX", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-[#F4F4F8] pb-28">

      {/* ─── HEADER CON GRADIENTE ─── */}
      <div className="relative bg-gradient-to-br from-[#2D2882] via-primary-500 to-[#7B5EA7] px-5 pt-14 pb-32 overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5" />

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 relative">
          <div>
            <p className="text-white/60 text-xs font-medium capitalize tracking-wide">{mesActual}</p>
            <h1 className="text-white text-xl font-bold mt-0.5">
              {nombre ? `Hola, ${nombre} 👋` : "Mis Finanzas"}
            </h1>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-10 h-10 rounded-2xl glass flex items-center justify-center"
            aria-label="Cerrar sesión"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-4 h-4" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>

        {/* Balance */}
        <div className="text-center relative">
          <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-2">Balance total</p>
          <p className={`text-5xl font-bold tabular-nums tracking-tight ${balance >= 0 ? "text-white" : "text-red-300"}`}>
            {cargando ? (
              <span className="inline-block w-40 h-12 bg-white/10 rounded-2xl animate-pulse" />
            ) : formatearMonto(balance)}
          </p>
        </div>
      </div>

      {/* ─── STAT CARDS (flotantes sobre el header) ─── */}
      <div className="px-4 -mt-16 relative z-10 mb-5">
        <div className="grid grid-cols-2 gap-3">
          {/* Ingresos */}
          <div className="bg-white rounded-3xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
                  <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04L10.75 5.612V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ingresos</span>
            </div>
            <p className="text-xl font-bold text-emerald-500 tabular-nums">
              {cargando ? <span className="inline-block w-20 h-6 bg-gray-100 rounded-lg animate-pulse" /> : formatearMonto(ingresos)}
            </p>
          </div>

          {/* Gastos */}
          <div className="bg-white rounded-3xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gastos</span>
            </div>
            <p className="text-xl font-bold text-red-400 tabular-nums">
              {cargando ? <span className="inline-block w-20 h-6 bg-gray-100 rounded-lg animate-pulse" /> : formatearMonto(gastos)}
            </p>
          </div>
        </div>
      </div>

      {/* ─── TRANSACCIONES ─── */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-gray-900">Movimientos</h2>
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center gap-1.5 bg-primary-500 text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-md shadow-primary-200 active:scale-95 transition-transform"
          >
            <span className="text-base leading-none">+</span> Agregar
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
          {cargando ? (
            <div>
              {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : transacciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 bg-primary-50 rounded-3xl flex items-center justify-center mb-4 text-3xl">
                💳
              </div>
              <p className="text-gray-700 font-semibold text-sm mb-1">Sin movimientos</p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Agrega uno manualmente o sube tu estado de cuenta desde Archivos
              </p>
            </div>
          ) : (
            <ul>
              {transacciones.slice(0, 25).map((t, idx) => (
                <li
                  key={t.id}
                  className={`flex items-center gap-3 px-5 py-4 ${idx < transacciones.slice(0, 25).length - 1 ? "border-b border-gray-50" : ""}`}
                >
                  <CategoriaIcono categoria={t.categoria || "Otros"} tipo={t.tipo} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                      {t.descripcion || t.categoria || "Sin descripción"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">
                      {new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      {t.categoria ? ` · ${t.categoria}` : ""}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${t.tipo === "ingreso" ? "text-emerald-500" : "text-gray-800"}`}>
                      {t.tipo === "ingreso" ? "+" : "-"}{formatearMonto(t.monto)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* FAB */}
      <button
        onClick={() => setMostrarFormulario(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary-500 text-white rounded-2xl shadow-xl shadow-primary-300 flex items-center justify-center text-2xl font-light hover:bg-primary-600 active:scale-95 transition-all"
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
