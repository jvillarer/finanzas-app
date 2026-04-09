"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";
import NuevaTransaccion from "@/components/NuevaTransaccion";
import { createClient } from "@/lib/supabase";

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

function Skel({ w, h }: { w: string; h: string }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${w} ${h}`}
      style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
    />
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
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

  useEffect(() => { cargar(); }, []);

  const { ingresos, gastos, balance } = calcularResumen(transacciones);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días," : hora < 18 ? "Buenas tardes," : "Buenas noches,";
  const mesRaw = new Date().toLocaleString("es-MX", { month: "long", year: "numeric" });
  const mesLabel = "SALDO · " + (mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1).toUpperCase());

  const lista = transacciones.filter((t) =>
    filtro === "todos" ? true : filtro === "gastos" ? t.tipo === "gasto" : t.tipo === "ingreso"
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#111" }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-14 pb-2 flex items-start justify-between">
        <div>
          <p className="text-sm" style={{ color: "#6b7280" }}>{saludo}</p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {cargando ? <Skel w="w-28" h="h-7" /> : (nombre || "Mis Finanzas")}
          </h1>
        </div>
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
            router.refresh();
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {iniciales}
        </button>
      </div>

      {/* ── BALANCE CARD ── */}
      <div className="mx-4 mt-4 p-5 rounded-3xl" style={{ backgroundColor: "#1c1c1c" }}>
        <p className="text-[10px] font-bold tracking-widest mb-1" style={{ color: "#6b7280" }}>
          {mesLabel}
        </p>

        {cargando
          ? <Skel w="w-44" h="h-12" />
          : <p className="text-5xl font-black tracking-tight" style={{ color: balance < 0 ? "#ef4444" : "#ffffff" }}>
              {formatearMonto(balance)}
            </p>
        }
        <p className="text-xs mb-4 mt-0.5" style={{ color: "#6b7280" }}>MXN disponibles</p>

        <div className="flex gap-2">
          <div className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
            {cargando
              ? <Skel w="w-20" h="h-5" />
              : <p className="text-lg font-black" style={{ color: "#22c55e" }}>+{formatearMonto(ingresos)}</p>
            }
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#6b7280" }}>Ingresos</p>
          </div>
          <div className="flex-1 rounded-2xl px-3 py-3" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
            {cargando
              ? <Skel w="w-20" h="h-5" />
              : <p className="text-lg font-black" style={{ color: "#ef4444" }}>-{formatearMonto(gastos)}</p>
            }
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#6b7280" }}>Gastos</p>
          </div>
        </div>
      </div>

      {/* ── FILTER TABS ── */}
      <div className="px-4 mt-5 mb-3 flex gap-2">
        {(["todos", "gastos", "ingresos"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className="px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
            style={{
              backgroundColor: filtro === f ? "#22c55e" : "#1c1c1c",
              color: filtro === f ? "#000" : "#6b7280",
            }}
          >
            {f === "todos" ? "Recientes" : f === "gastos" ? "Gastos" : "Ingresos"}
          </button>
        ))}
      </div>

      {/* ── LISTA ── */}
      <div className="px-4 space-y-0.5 pb-6">
        {cargando
          ? [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-4 animate-pulse">
                <div className="w-11 h-11 rounded-2xl shrink-0" style={{ backgroundColor: "#1c1c1c" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded-full w-1/2" style={{ backgroundColor: "#1c1c1c" }} />
                  <div className="h-2.5 rounded-full w-1/3" style={{ backgroundColor: "#1c1c1c" }} />
                </div>
                <div className="h-4 rounded-full w-16" style={{ backgroundColor: "#1c1c1c" }} />
              </div>
            ))
          : lista.length === 0
          ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">💳</p>
              <p className="text-sm font-semibold text-white mb-1">Sin movimientos</p>
              <p className="text-xs" style={{ color: "#6b7280" }}>Agrega tu primer gasto con el botón +</p>
            </div>
          )
          : lista.slice(0, 30).map((t) => {
              const emoji = t.tipo === "ingreso" ? "💰" : (CAT_ICON[t.categoria] || "📦");
              const fechaStr = new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", {
                day: "numeric", month: "short",
              });
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl px-1 py-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: "#1c1c1c" }}
                  >
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {t.descripcion || t.categoria || "Sin descripción"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                      {fechaStr}{t.categoria ? ` · ${t.categoria}` : ""}
                    </p>
                  </div>
                  <p
                    className="text-sm font-black shrink-0"
                    style={{ color: t.tipo === "ingreso" ? "#22c55e" : "#ffffff" }}
                  >
                    {t.tipo === "ingreso" ? "+" : "−"}{formatearMonto(t.monto)}
                  </p>
                </div>
              );
            })
        }
      </div>

      {/* FAB */}
      <button
        onClick={() => setMostrarFormulario(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-2xl text-black text-2xl font-bold flex items-center justify-center active:scale-95 transition-transform"
        style={{ backgroundColor: "#22c55e", boxShadow: "0 8px 24px rgba(34,197,94,0.35)" }}
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
