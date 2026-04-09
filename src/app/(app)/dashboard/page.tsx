"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";
import NuevaTransaccion from "@/components/NuevaTransaccion";
import { createClient } from "@/lib/supabase";

// Color por categoría
const COLOR_CAT: Record<string, string> = {
  Comida:         "bg-orange-400",
  Supermercado:   "bg-emerald-400",
  Transporte:     "bg-blue-400",
  Entretenimiento:"bg-violet-400",
  Salud:          "bg-rose-400",
  Servicios:      "bg-amber-400",
  Ropa:           "bg-pink-400",
  Hogar:          "bg-teal-400",
  Educación:      "bg-indigo-400",
  Otros:          "bg-gray-400",
};

function InicialCategoria({ categoria, tipo }: { categoria: string; tipo: string }) {
  if (tipo === "ingreso") {
    return (
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-emerald-600" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
    );
  }
  const color = COLOR_CAT[categoria] || "bg-gray-400";
  const inicial = (categoria || "O")[0].toUpperCase();
  return (
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0`}>
      <span className="text-white text-sm font-bold">{inicial}</span>
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
    <main className="min-h-screen bg-gray-50 pb-24">

      {/* ── HEADER MORADO ── */}
      <header className="bg-primary-500 px-6 pt-12 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary-200 text-xs capitalize">{mesActual}</p>
            <h1 className="text-white text-lg font-bold">
              {nombre ? `Hola, ${nombre} 👋` : "Mis Finanzas"}
            </h1>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="Cerrar sesión"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>

        {/* Balance grande */}
        <div className="text-center">
          <p className="text-primary-200 text-xs mb-1 tracking-widest uppercase">Balance total</p>
          <p className={`text-5xl font-bold tracking-tight ${balance >= 0 ? "text-white" : "text-red-300"}`}>
            {cargando ? "—" : formatearMonto(balance)}
          </p>
        </div>
      </header>

      {/* ── CARDS FLOTANTES ── */}
      <div className="px-4 -mt-10 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-emerald-600">
                  <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs text-gray-400 font-medium">Ingresos</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{cargando ? "—" : formatearMonto(ingresos)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-red-500">
                  <path fillRule="evenodd" d="M3.75 12a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs text-gray-400 font-medium">Gastos</span>
            </div>
            <p className="text-xl font-bold text-red-500">{cargando ? "—" : formatearMonto(gastos)}</p>
          </div>
        </div>
      </div>

      {/* ── TRANSACCIONES ── */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800">Movimientos recientes</h2>
          <button
            onClick={() => setMostrarFormulario(true)}
            className="text-xs text-primary-500 font-semibold"
          >
            + Agregar
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary-300 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : transacciones.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-3xl mb-3">💳</p>
              <p className="text-gray-400 text-sm">No hay movimientos aún</p>
              <p className="text-gray-300 text-xs mt-1">Sube un estado de cuenta o agrega uno manualmente</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {transacciones.slice(0, 20).map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                  <InicialCategoria categoria={t.categoria || "Otros"} tipo={t.tipo} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {t.descripcion || t.categoria || "Sin descripción"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      {t.categoria ? ` · ${t.categoria}` : ""}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${t.tipo === "ingreso" ? "text-emerald-600" : "text-gray-700"}`}>
                    {t.tipo === "ingreso" ? "+" : "-"}{formatearMonto(t.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* FAB */}
      <button
        onClick={() => setMostrarFormulario(true)}
        className="fixed bottom-20 right-5 bg-primary-500 text-white w-14 h-14 rounded-full shadow-xl text-2xl flex items-center justify-center hover:bg-primary-600 active:scale-95 transition-all"
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
