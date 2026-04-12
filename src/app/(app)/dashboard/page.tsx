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
  Comida: "🍽", Supermercado: "🛒", Transporte: "🚗",
  Entretenimiento: "🎬", Salud: "💊", Servicios: "⚡",
  Ropa: "👕", Hogar: "🏠", Educación: "📚", Otros: "📦",
};

type Filtro = "todos" | "gastos" | "ingresos";

function Skel({ w, h, rounded = "8px" }: { w: string; h: string; rounded?: string }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: rounded }} />;
}

function agruparPorFecha(txs: Transaccion[]): [string, Transaccion[]][] {
  const hoy = new Date().toISOString().split("T")[0];
  const ayer = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const grupos: Record<string, Transaccion[]> = {};
  for (const t of txs) {
    const label =
      t.fecha === hoy ? "Hoy" :
      t.fecha === ayer ? "Ayer" :
      new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    if (!grupos[label]) grupos[label] = [];
    grupos[label].push(t);
  }
  return Object.entries(grupos);
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
      setTimeout(() => setMostrarBannerNotif(true), 4000);
    }
  }, []);

  const { ingresos, gastos, balance } = calcularResumen(transacciones);
  const spendingPct = ingresos > 0 ? Math.min((gastos / ingresos) * 100, 100) : 0;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const mesRaw = new Date().toLocaleString("es-MX", { month: "long" });
  const mesLabel = mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1);

  const lista = transacciones.filter((t) =>
    filtro === "todos" ? true : filtro === "gastos" ? t.tipo === "gasto" : t.tipo === "ingreso"
  ).slice(0, 40);

  const grupos = agruparPorFecha(lista);

  return (
    <main className="min-h-screen no-scroll" style={{ backgroundColor: "var(--bg)" }}>

      {/* ── HEADER ── */}
      <div className="px-5 pt-14 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: "var(--text-3)" }}>{saludo}</p>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-1)" }}>
            {cargando ? <Skel w="112px" h="28px" rounded="8px" /> : (nombre || "Mis finanzas")}
          </h1>
        </div>
        <button
          onClick={() => router.push("/perfil")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-opacity active:opacity-60"
          style={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--gold-border)",
            color: "var(--gold)",
            fontSize: "11px",
            letterSpacing: "0.5px",
          }}
        >
          {iniciales}
        </button>
      </div>

      {/* ── BALANCE HERO ── */}
      <div className="px-5 pt-6 pb-6">
        <p
          className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2"
          style={{ color: "var(--text-3)" }}
        >
          Balance · {mesLabel}
        </p>
        {cargando ? (
          <Skel w="220px" h="60px" rounded="10px" />
        ) : (
          <p
            className="font-display leading-none mb-1"
            style={{
              fontSize: "clamp(44px, 12vw, 56px)",
              fontWeight: 500,
              color: balance < 0 ? "var(--danger)" : "var(--text-1)",
              letterSpacing: "-0.02em",
            }}
          >
            {formatearMonto(balance)}
          </p>
        )}
        <p className="text-xs font-medium mt-2" style={{ color: "var(--text-3)" }}>MXN disponibles</p>

        {/* Income / Expense pills */}
        <div className="flex gap-2 mt-5">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl flex-1"
            style={{ backgroundColor: "var(--success-dim)", border: "1px solid rgba(62,207,142,0.15)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--success)" }} />
            <div>
              {cargando
                ? <Skel w="64px" h="16px" />
                : <p className="text-sm font-bold font-number" style={{ color: "var(--success)" }}>
                    +{formatearMonto(ingresos)}
                  </p>
              }
              <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-3)" }}>Ingresos</p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-2xl flex-1"
            style={{ backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.15)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--danger)" }} />
            <div>
              {cargando
                ? <Skel w="64px" h="16px" />
                : <p className="text-sm font-bold font-number" style={{ color: "var(--danger)" }}>
                    -{formatearMonto(gastos)}
                  </p>
              }
              <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-3)" }}>Gastos</p>
            </div>
          </div>
        </div>

        {/* Spending rate */}
        {!cargando && ingresos > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                Gasto del mes
              </p>
              <p className="text-[10px] font-bold" style={{ color: spendingPct >= 90 ? "var(--danger)" : spendingPct >= 70 ? "var(--warning)" : "var(--text-2)" }}>
                {spendingPct.toFixed(0)}%
              </p>
            </div>
            <div className="w-full rounded-full h-1" style={{ backgroundColor: "var(--surface-2)" }}>
              <div
                className="h-1 rounded-full transition-all duration-700"
                style={{
                  width: `${spendingPct}%`,
                  backgroundColor: spendingPct >= 90 ? "var(--danger)" : spendingPct >= 70 ? "var(--warning)" : "var(--gold)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── DIVIDER ── */}
      <div style={{ height: "1px", backgroundColor: "var(--border-2)", margin: "0 20px" }} />

      {/* ── BANNER NOTIFICACIONES ── */}
      {mostrarBannerNotif && (
        <div
          className="mx-5 mt-4 px-4 py-3 rounded-2xl flex items-center gap-3 fade-in"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span className="text-lg shrink-0">🐑</span>
          <p className="text-xs font-medium flex-1 leading-relaxed" style={{ color: "var(--text-2)" }}>
            Lani puede avisarte si te pasas del límite
          </p>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setMostrarBannerNotif(false)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-3)" }}
            >
              No
            </button>
            <button
              onClick={async () => { await pedirPermisoNotificaciones(); setMostrarBannerNotif(false); }}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "var(--gold)", color: "#0c0c0e" }}
            >
              Activar
            </button>
          </div>
        </div>
      )}

      {/* ── FILTROS ── */}
      <div className="px-5 mt-5 mb-3 flex gap-2">
        {(["todos", "gastos", "ingresos"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all"
            style={{
              backgroundColor: filtro === f ? "var(--surface-3)" : "transparent",
              color: filtro === f ? "var(--text-1)" : "var(--text-3)",
              border: filtro === f ? "1px solid var(--border)" : "1px solid transparent",
            }}
          >
            {f === "todos" ? "Recientes" : f === "gastos" ? "Gastos" : "Ingresos"}
          </button>
        ))}
      </div>

      {/* ── LISTA AGRUPADA ── */}
      <div className="px-5 pb-28">
        {cargando ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: "1px solid var(--border-2)" }}>
                <Skel w="40px" h="40px" rounded="12px" />
                <div className="flex-1 space-y-2">
                  <Skel w="40%" h="13px" />
                  <Skel w="24%" h="10px" />
                </div>
                <Skel w="60px" h="14px" />
              </div>
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div
            className="text-center py-14 rounded-2xl"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3" style={{ backgroundColor: "var(--surface-2)" }}>
              💳
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-2)" }}>Sin movimientos</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Toca + para agregar tu primer gasto</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grupos.map(([fecha, txs]) => (
              <div key={fecha}>
                {/* Date label */}
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2"
                  style={{ color: "var(--text-3)" }}
                >
                  {fecha}
                </p>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {txs.map((t, idx) => {
                    const emoji = t.tipo === "ingreso" ? "💰" : (CAT_ICON[t.categoria] || "📦");
                    const esIngreso = t.tipo === "ingreso";
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTransaccionEditar(t)}
                        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                        style={{
                          borderBottom: idx < txs.length - 1 ? "1px solid var(--border-2)" : "none",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ backgroundColor: "var(--surface-2)" }}
                        >
                          {emoji}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>
                            {t.descripcion || t.categoria || "Sin descripción"}
                          </p>
                          {t.categoria && (
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                              {t.categoria}
                            </p>
                          )}
                        </div>
                        {/* Amount */}
                        <p
                          className="text-sm font-bold shrink-0 font-number"
                          style={{ color: esIngreso ? "var(--success)" : "var(--text-2)" }}
                        >
                          {esIngreso ? "+" : "−"}{formatearMonto(t.monto)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setMostrarFormulario(true)}
        className="fixed bottom-24 right-5 w-13 h-13 rounded-2xl text-lg font-bold flex items-center justify-center active:scale-95 transition-transform"
        style={{
          width: 52,
          height: 52,
          backgroundColor: "var(--gold)",
          color: "#0c0c0e",
          boxShadow: "var(--shadow-gold)",
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
