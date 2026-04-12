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
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>

      {/* HEADER */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>{saludo},</p>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>
            {cargando ? <Skel w="w-28" h="h-7" /> : (nombre || "Mis Finanzas")}
          </h1>
        </div>
        <button
          onClick={() => router.push("/perfil")}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{
            background: "linear-gradient(135deg, #1f6b4e, #2a8a64)",
            boxShadow: "0 4px 14px rgba(31,107,78,0.35)",
          }}
        >
          {iniciales}
        </button>
      </div>

      {/* BALANCE CARD */}
      <div className="mx-4 mb-4">
        <div className="balance-card-bg rounded-3xl p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
            Balance · {mesLabel}
          </p>
          {cargando
            ? <div className="h-12 w-44 rounded-xl mb-1" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
            : <p className="text-5xl font-black tracking-tight mb-1 font-number" style={{ color: balance < 0 ? "#f87171" : "#ffffff" }}>
                {formatearMonto(balance)}
              </p>
          }
          <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.25)" }}>MXN disponibles</p>

          <div className="flex gap-2">
            {/* Ingresos */}
            <div
              className="flex-1 rounded-2xl px-3.5 py-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {cargando
                ? <div className="h-5 w-20 rounded-lg mb-1" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                : <p className="text-base font-black font-number" style={{ color: "#4ade80" }}>
                    +{formatearMonto(ingresos)}
                  </p>
              }
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Ingresos</p>
            </div>
            {/* Gastos */}
            <div
              className="flex-1 rounded-2xl px-3.5 py-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {cargando
                ? <div className="h-5 w-20 rounded-lg mb-1" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
                : <p className="text-base font-black font-number" style={{ color: "#f87171" }}>
                    -{formatearMonto(gastos)}
                  </p>
              }
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Gastos</p>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER NOTIFICACIONES */}
      {mostrarBannerNotif && (
        <div
          className="mx-4 mb-4 px-4 py-3.5 rounded-2xl flex items-center gap-3 fade-in bg-white"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <span className="text-xl shrink-0">🐑</span>
          <p className="text-xs font-medium flex-1 leading-relaxed" style={{ color: "var(--text-2)" }}>
            Activa notificaciones y Lani te avisa cuando te pasas del límite
          </p>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setMostrarBannerNotif(false)}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-3)" }}
            >
              No
            </button>
            <button
              onClick={async () => { await pedirPermisoNotificaciones(); setMostrarBannerNotif(false); }}
              className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
              style={{ backgroundColor: "var(--accent)" }}
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
              backgroundColor: filtro === f ? "var(--text-1)" : "var(--surface)",
              color: filtro === f ? "#fff" : "var(--text-3)",
              boxShadow: filtro === f ? "none" : "var(--shadow-sm)",
              border: filtro === f ? "none" : "1px solid rgba(0,0,0,0.05)",
            }}
          >
            {f === "todos" ? "Recientes" : f === "gastos" ? "Gastos" : "Ingresos"}
          </button>
        ))}
      </div>

      {/* LISTA */}
      <div className="mx-4 pb-8">
        {cargando ? (
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
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
          <div
            className="text-center py-16 bg-white rounded-3xl"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              💳
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Sin movimientos</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Agrega tu primer gasto con el botón +</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
            {lista.slice(0, 30).map((t, idx) => {
              const emoji = t.tipo === "ingreso" ? "💰" : (CAT_ICON[t.categoria] || "📦");
              const fechaStr = new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", {
                day: "numeric", month: "short",
              });
              const esIngreso = t.tipo === "ingreso";
              return (
                <div
                  key={t.id}
                  onClick={() => setTransaccionEditar(t)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors active:bg-gray-50"
                  style={{ borderBottom: idx < lista.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                    style={{
                      backgroundColor: esIngreso ? "var(--accent-light, #e6f4ed)" : "var(--surface-2)",
                    }}
                  >
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-1)" }}>
                      {t.descripcion || t.categoria || "Sin descripción"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                      {fechaStr}{t.categoria ? ` · ${t.categoria}` : ""}
                    </p>
                  </div>
                  <p
                    className="text-sm font-black shrink-0 font-number"
                    style={{ color: esIngreso ? "var(--success)" : "var(--text-1)" }}
                  >
                    {esIngreso ? "+" : "−"}{formatearMonto(t.monto)}
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
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl text-white text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
        style={{
          background: "linear-gradient(135deg, #1a5e44, #2a8a64)",
          boxShadow: "0 8px 28px rgba(31,107,78,0.4), 0 4px 12px rgba(0,0,0,0.15)",
        }}
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
