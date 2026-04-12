"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";
import NuevaTransaccion from "@/components/NuevaTransaccion";
import EditarTransaccion from "@/components/EditarTransaccion";
import { createClient } from "@/lib/supabase";
import { registrarServiceWorker, pedirPermisoNotificaciones } from "@/lib/notificaciones";

const CAT_ICON: Record<string, string> = {
  Comida: "🍽",
  Supermercado: "🛒",
  Transporte: "🚗",
  Entretenimiento: "🎬",
  Salud: "💊",
  Servicios: "⚡",
  Ropa: "👕",
  Hogar: "🏠",
  Educación: "📚",
  Otros: "📦",
};

type Filtro = "todos" | "gastos" | "ingresos";

function Skel({ w, h, rounded = "rounded-xl" }: { w: string; h: string; rounded?: string }) {
  return <div className={`skeleton ${w} ${h} ${rounded}`} />;
}

export default function DashboardPage() {
  const router = useRouter();
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [transaccionEditar, setTransaccionEditar] = useState<Transaccion | null>(null);
  const [mostrarBannerNotif, setMostrarBannerNotif] = useState(false);
  const [nombre, setNombre] = useState("");
  const [iniciales, setIniciales] = useState("??");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const cargar = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.nombre_completo) {
        const n = user.user_metadata.nombre_completo as string;
        setNombre(n.split(" ")[0]);
        setIniciales(n.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase());
      }
      const datos = await obtenerTransacciones();
      setTransacciones(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    registrarServiceWorker();
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => setMostrarBannerNotif(true), 3000);
    }
  }, []);

  const { ingresos, gastos, balance } = calcularResumen(transacciones);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const mesRaw = new Date().toLocaleString("es-MX", { month: "long" });
  const mesLabel = mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1);

  const lista = transacciones.filter((t) =>
    filtro === "todos" ? true : filtro === "gastos" ? t.tipo === "gasto" : t.tipo === "ingreso"
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#f2f2f7" }}>

      {/* HEADER */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400">{saludo},</p>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {cargando ? <Skel w="w-28" h="h-7" /> : (nombre || "Mis Finanzas")}
          </h1>
        </div>
        <button
          onClick={() => router.push("/perfil")}
          className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md"
        >
          {iniciales}
        </button>
      </div>

      {/* BALANCE CARD */}
      <div className="mx-4 mb-4">
        <div className="balance-card-bg rounded-3xl p-5">
          <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-3">
            Balance · {mesLabel}
          </p>
          {cargando
            ? <div className="h-12 w-44 rounded-xl bg-white/10 animate-pulse mb-1" />
            : <p className="text-5xl font-black tracking-tight mb-1 font-number" style={{ color: balance < 0 ? "#f87171" : "#ffffff" }}>
                {formatearMonto(balance)}
              </p>
          }
          <p className="text-xs text-white/30 mb-4">MXN disponibles</p>

          <div className="flex gap-2">
            <div className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {cargando
                ? <div className="h-5 w-20 rounded-lg bg-white/10 animate-pulse mb-1" />
                : <p className="text-base font-black text-green-400 font-number">+{formatearMonto(ingresos)}</p>
              }
              <p className="text-[10px] font-semibold text-white/40 mt-0.5">Ingresos</p>
            </div>
            <div className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {cargando
                ? <div className="h-5 w-20 rounded-lg bg-white/10 animate-pulse mb-1" />
                : <p className="text-base font-black text-red-400 font-number">-{formatearMonto(gastos)}</p>
              }
              <p className="text-[10px] font-semibold text-white/40 mt-0.5">Gastos</p>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER NOTIFICACIONES */}
      {mostrarBannerNotif && (
        <div className="mx-4 mb-4 px-4 py-3.5 rounded-2xl bg-white flex items-center gap-3 fade-in" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <span className="text-xl shrink-0">🐑</span>
          <p className="text-xs font-medium text-gray-500 flex-1 leading-relaxed">
            Activa notificaciones y Lani te avisa cuando te pasas del límite
          </p>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => setMostrarBannerNotif(false)} className="text-xs font-bold px-3 py-1.5 rounded-full text-gray-400 bg-gray-100">
              No
            </button>
            <button
              onClick={async () => { await pedirPermisoNotificaciones(); setMostrarBannerNotif(false); }}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-black text-white"
            >
              Activar
            </button>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="px-4 mb-3 flex gap-2">
        {(["todos", "gastos", "ingresos"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className="px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
            style={{
              backgroundColor: filtro === f ? "#000" : "#fff",
              color: filtro === f ? "#fff" : "#6b7280",
              boxShadow: filtro === f ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
              border: filtro === f ? "none" : "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {f === "todos" ? "Recientes" : f === "gastos" ? "Gastos" : "Ingresos"}
          </button>
        ))}
      </div>

      {/* LISTA */}
      <div className="mx-4 pb-8">
        {cargando ? (
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 last:border-0">
                <div className="w-11 h-11 rounded-2xl skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 skeleton w-2/5" />
                  <div className="h-2.5 skeleton w-1/4" />
                </div>
                <div className="h-4 skeleton w-16" />
              </div>
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">💳</div>
            <p className="text-sm font-bold text-gray-800 mb-1">Sin movimientos</p>
            <p className="text-xs text-gray-400">Agrega tu primer gasto con el botón +</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {lista.slice(0, 30).map((t, idx) => {
              const emoji = t.tipo === "ingreso" ? "💰" : (CAT_ICON[t.categoria] || "📦");
              const fechaStr = new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", {
                day: "numeric", month: "short",
              });
              return (
                <div
                  key={t.id}
                  onClick={() => setTransaccionEditar(t)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-50 transition-colors"
                  style={{ borderBottom: idx < lista.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
                >
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {t.descripcion || t.categoria || "Sin descripción"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {fechaStr}{t.categoria ? ` · ${t.categoria}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-black shrink-0 font-number" style={{ color: t.tipo === "ingreso" ? "#16a34a" : "#111827" }}>
                    {t.tipo === "ingreso" ? "+" : "−"}{formatearMonto(t.monto)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setMostrarFormulario(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform bg-black"
        style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
      >
        +
      </button>

      {mostrarFormulario && (
        <NuevaTransaccion
          onCerrar={() => setMostrarFormulario(false)}
          onGuardado={() => { setMostrarFormulario(false); cargar(); }}
        />
      )}

      {transaccionEditar && (
        <EditarTransaccion
          transaccion={transaccionEditar}
          onCerrar={() => setTransaccionEditar(null)}
          onGuardado={() => { setTransaccionEditar(null); cargar(); }}
          onEliminado={() => { setTransaccionEditar(null); cargar(); }}
        />
      )}
    </main>
  );
}
