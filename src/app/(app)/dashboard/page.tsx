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

function Skel({ w, h, r = "8px" }: { w: string; h: string; r?: string }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />;
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
      setTimeout(() => setMostrarBannerNotif(true), 5000);
    }
  }, []);

  const { ingresos, gastos, balance } = calcularResumen(transacciones);
  const spendingPct = ingresos > 0 ? Math.min((gastos / ingresos) * 100, 100) : 0;
  const spendingColor = spendingPct >= 90 ? "var(--danger)" : spendingPct >= 70 ? "var(--warning)" : "var(--gold)";

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
      <div className="px-5 pt-14 pb-2 flex items-center justify-between">
        <div>
          <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, letterSpacing: "0.01em" }}>
            {saludo}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {cargando ? <Skel w="100px" h="26px" /> : (nombre || "Mis finanzas")}
          </h1>
        </div>
        <button
          onClick={() => router.push("/perfil")}
          className="flex items-center justify-center shrink-0 transition-opacity active:opacity-50"
          style={{
            width: 36, height: 36,
            borderRadius: "50%",
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--gold-border)",
            color: "var(--gold)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {iniciales}
        </button>
      </div>

      {/* ── BALANCE HERO ── */}
      <div className="px-5 pt-5 pb-5">
        {/* Label */}
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>
          {mesLabel}
        </p>

        {/* Big number */}
        {cargando ? (
          <Skel w="200px" h="56px" r="10px" />
        ) : (
          <p
            className="font-display"
            style={{
              fontSize: "clamp(42px, 11vw, 54px)",
              fontWeight: 400,
              fontStyle: "italic",
              color: balance < 0 ? "var(--danger)" : "var(--text-1)",
              letterSpacing: "-0.025em",
              lineHeight: 1,
            }}
          >
            {formatearMonto(balance)}
          </p>
        )}

        {/* Income / Expense row */}
        <div className="flex gap-3 mt-4">
          <div style={{ flex: 1 }}>
            {cargando
              ? <Skel w="80px" h="18px" />
              : <p className="font-number" style={{ fontSize: 14, fontWeight: 600, color: "var(--success)", letterSpacing: "-0.02em" }}>
                  +{formatearMonto(ingresos)}
                </p>
            }
            <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2, fontWeight: 500 }}>Ingresos</p>
          </div>
          <div style={{ width: 1, backgroundColor: "var(--border-2)", alignSelf: "stretch" }} />
          <div style={{ flex: 1 }}>
            {cargando
              ? <Skel w="80px" h="18px" />
              : <p className="font-number" style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)", letterSpacing: "-0.02em" }}>
                  −{formatearMonto(gastos)}
                </p>
            }
            <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2, fontWeight: 500 }}>Gastos</p>
          </div>
        </div>

        {/* Spending rate */}
        {!cargando && ingresos > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>
                {spendingPct >= 90 ? "⚠ Casi al límite" : spendingPct >= 70 ? "Ojo con los gastos" : "Vas bien este mes"}
              </p>
              <p className="font-number" style={{ fontSize: 10, fontWeight: 700, color: spendingColor }}>
                {spendingPct.toFixed(0)}%
              </p>
            </div>
            <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
              <div style={{
                height: 3, borderRadius: 99,
                width: `${spendingPct}%`,
                backgroundColor: spendingColor,
                transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ── SEPARATOR ── */}
      <div style={{ height: "1px", backgroundColor: "var(--border-2)" }} />

      {/* ── BANNER NOTIFICACIONES ── */}
      {mostrarBannerNotif && (
        <div
          className="fade-in"
          style={{
            margin: "12px 20px 0",
            padding: "12px 14px",
            borderRadius: "var(--r-md)",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>🐑</span>
          <p style={{ fontSize: 12, color: "var(--text-2)", flex: 1, lineHeight: 1.4, fontWeight: 400 }}>
            Activa alertas y Lani te avisa si te pasas de un límite
          </p>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setMostrarBannerNotif(false)}
              style={{ fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: 99, backgroundColor: "var(--surface-3)", color: "var(--text-3)", border: "none" }}
            >
              No
            </button>
            <button
              onClick={async () => { await pedirPermisoNotificaciones(); setMostrarBannerNotif(false); }}
              style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 99, backgroundColor: "var(--gold)", color: "#0c0c0e", border: "none" }}
            >
              Activar
            </button>
          </div>
        </div>
      )}

      {/* ── FILTROS — text tabs ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 20px 10px" }}>
        {(["todos", "gastos", "ingresos"] as Filtro[]).map((f) => {
          const activo = filtro === f;
          const label = f === "todos" ? "Recientes" : f === "gastos" ? "Gastos" : "Ingresos";
          return (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={{
                fontSize: 13,
                fontWeight: activo ? 700 : 500,
                color: activo ? "var(--text-1)" : "var(--text-3)",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                position: "relative",
                paddingBottom: 6,
                transition: "color 0.15s",
              }}
            >
              {label}
              {activo && (
                <span style={{
                  position: "absolute",
                  bottom: 0, left: 0, right: 0,
                  height: 1.5,
                  borderRadius: 99,
                  backgroundColor: "var(--gold)",
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── LISTA AGRUPADA ── */}
      <div style={{ padding: "0 20px 120px" }}>
        {cargando ? (
          <div style={{ borderRadius: "var(--r-lg)", overflow: "hidden", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid var(--border-2)" }}>
                <Skel w="40px" h="40px" r="12px" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  <Skel w="38%" h="12px" />
                  <Skel w="22%" h="10px" />
                </div>
                <Skel w="56px" h="13px" />
              </div>
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 20px",
            borderRadius: "var(--r-lg)",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 20 }}>
              💳
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>Sin movimientos</p>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>Toca + para registrar tu primer gasto</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {grupos.map(([fecha, txs]) => (
              <div key={fecha}>
                {/* Date header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    {fecha}
                  </p>
                  <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-2)" }} />
                </div>

                {/* Transactions */}
                <div style={{ borderRadius: "var(--r-lg)", overflow: "hidden", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  {txs.map((t, idx) => {
                    const emoji = t.tipo === "ingreso" ? "💰" : (CAT_ICON[t.categoria] || "📦");
                    const esIngreso = t.tipo === "ingreso";
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTransaccionEditar(t)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "13px 16px",
                          cursor: "pointer",
                          borderBottom: idx < txs.length - 1 ? "1px solid var(--border-2)" : "none",
                          transition: "background-color 0.1s",
                        }}
                        onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                        onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {/* Icon */}
                        <div style={{
                          width: 38, height: 38,
                          borderRadius: 11,
                          backgroundColor: "var(--surface-2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 17, flexShrink: 0,
                        }}>
                          {emoji}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 13, fontWeight: 600,
                            color: "var(--text-1)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {t.descripcion || t.categoria || "Sin descripción"}
                          </p>
                          {t.categoria && t.descripcion && (
                            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, fontWeight: 400 }}>
                              {t.categoria}
                            </p>
                          )}
                        </div>

                        {/* Amount */}
                        <p className="font-number" style={{
                          fontSize: 13,
                          fontWeight: 600,
                          flexShrink: 0,
                          color: esIngreso ? "var(--success)" : "var(--text-1)",
                        }}>
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
        className="active:scale-95 transition-transform"
        style={{
          position: "fixed",
          bottom: 80, right: 20,
          width: 50, height: 50,
          borderRadius: 16,
          backgroundColor: "var(--gold)",
          color: "#0c0c0e",
          border: "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-gold)",
        }}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 18, height: 18 }}>
          <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
        </svg>
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
