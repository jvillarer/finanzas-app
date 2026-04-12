"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import { calcularProyeccion } from "@/lib/proyeccion";
import { detectarRecurrentes, totalRecurrentes } from "@/lib/recurrentes";
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
  const [mostrarRecurrentes, setMostrarRecurrentes] = useState(false);

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

  const proyeccion = calcularProyeccion(transacciones);
  const recurrentes = detectarRecurrentes(transacciones);
  const totalSuscripciones = totalRecurrentes(recurrentes);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const hoy = new Date();
  const diaFinMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const mesCorto = hoy.toLocaleString("es-MX", { month: "short" });

  const lista = transacciones.filter((t) =>
    filtro === "todos" ? true : filtro === "gastos" ? t.tipo === "gasto" : t.tipo === "ingreso"
  ).slice(0, 40);

  const grupos = agruparPorFecha(lista);

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "56px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{saludo}</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", lineHeight: 1.2, marginTop: 1 }}>
            {cargando ? <Skel w="100px" h="26px" /> : (nombre || "Mis finanzas")}
          </h1>
        </div>
        <button
          onClick={() => router.push("/perfil")}
          className="active:opacity-50 transition-opacity"
          style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--gold-border)",
            color: "var(--gold)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {iniciales}
        </button>
      </div>

      {/* ── BALANCE HERO ── */}
      <div style={{ padding: "20px 20px 16px" }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 10 }}>
          {hoy.toLocaleString("es-MX", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase())}
        </p>

        {cargando ? <Skel w="200px" h="52px" r="10px" /> : (
          <p className="font-display" style={{
            fontSize: "clamp(42px, 11vw, 54px)",
            fontWeight: 400, fontStyle: "italic",
            color: balance < 0 ? "var(--danger)" : "var(--text-1)",
            letterSpacing: "-0.025em", lineHeight: 1,
          }}>
            {formatearMonto(balance)}
          </p>
        )}

        {/* Ingresos / Gastos */}
        <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
          <div>
            {cargando ? <Skel w="80px" h="16px" /> : (
              <p className="font-number" style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", letterSpacing: "-0.02em" }}>
                +{formatearMonto(ingresos)}
              </p>
            )}
            <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2, fontWeight: 500 }}>Ingresos</p>
          </div>
          <div style={{ width: 1, backgroundColor: "var(--border-2)", alignSelf: "stretch" }} />
          <div>
            {cargando ? <Skel w="80px" h="16px" /> : (
              <p className="font-number" style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)", letterSpacing: "-0.02em" }}>
                −{formatearMonto(gastos)}
              </p>
            )}
            <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2, fontWeight: 500 }}>Gastos</p>
          </div>
        </div>

        {/* Spending rate */}
        {!cargando && ingresos > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>
                {spendingPct >= 90 ? "⚠ Casi al límite" : spendingPct >= 70 ? "Ojo con los gastos" : "Vas bien este mes"}
              </p>
              <p className="font-number" style={{ fontSize: 10, fontWeight: 700, color: spendingColor }}>
                {spendingPct.toFixed(0)}%
              </p>
            </div>
            <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
              <div style={{ height: 3, borderRadius: 99, width: `${spendingPct}%`, backgroundColor: spendingColor, transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)" }} />
            </div>
          </div>
        )}
      </div>

      {/* ── INFO CARDS: Proyección + Recurrentes ── */}
      {!cargando && (
        <div style={{ padding: "0 20px 4px", display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Proyección fin de mes */}
          {proyeccion.motivo === "ok" && proyeccion.proyectado !== null && (
            <div style={{
              padding: "12px 14px", borderRadius: 14,
              backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                  Proyección {diaFinMes} {mesCorto}
                </p>
                <p className="font-number" style={{
                  fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
                  color: proyeccion.proyectado >= 0 ? "var(--success)" : "var(--danger)",
                }}>
                  ~{formatearMonto(proyeccion.proyectado)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.6 }}>
                  Día {proyeccion.diasTranscurridos} de {proyeccion.diasEnMes}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-3)" }}>
                  Quedan {proyeccion.diasRestantes} días
                </p>
              </div>
            </div>
          )}

          {/* Recurrentes detectados */}
          {recurrentes.length > 0 && (
            <div style={{
              borderRadius: 14,
              backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              overflow: "hidden",
            }}>
              <button
                onClick={() => setMostrarRecurrentes(!mostrarRecurrentes)}
                style={{
                  width: "100%", padding: "12px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: "transparent", border: "none", cursor: "pointer",
                }}
              >
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3, textAlign: "left" }}>
                    Suscripciones · {recurrentes.length} detectadas
                  </p>
                  <p className="font-number" style={{ fontSize: 16, fontWeight: 700, color: "var(--danger)", letterSpacing: "-0.02em", textAlign: "left" }}>
                    −{formatearMonto(totalSuscripciones)}<span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-3)" }}> /mes</span>
                  </p>
                </div>
                <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 14, height: 14, flexShrink: 0, transform: mostrarRecurrentes ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {mostrarRecurrentes && (
                <div style={{ borderTop: "1px solid var(--border-2)" }}>
                  {recurrentes.slice(0, 8).map((r, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: i < Math.min(recurrentes.length, 8) - 1 ? "1px solid var(--border-2)" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14 }}>🔁</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)" }}>{r.descripcion}</p>
                          <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
                            {r.mesesDetectados} meses seguidos
                          </p>
                        </div>
                      </div>
                      <p className="font-number" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>
                        {formatearMonto(r.montoPromedio)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SEPARATOR ── */}
      <div style={{ height: 1, backgroundColor: "var(--border-2)", margin: "12px 0 0" }} />

      {/* ── BANNER NOTIFICACIONES ── */}
      {mostrarBannerNotif && (
        <div className="fade-in" style={{
          margin: "12px 20px 0", padding: "12px 14px", borderRadius: 14,
          backgroundColor: "var(--surface)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🐑</span>
          <p style={{ fontSize: 12, color: "var(--text-2)", flex: 1, lineHeight: 1.4 }}>
            Activa alertas y Lani te avisa si te pasas de un límite
          </p>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => setMostrarBannerNotif(false)}
              style={{ fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: 99, backgroundColor: "var(--surface-3)", color: "var(--text-3)", border: "none", cursor: "pointer" }}>
              No
            </button>
            <button onClick={async () => { await pedirPermisoNotificaciones(); setMostrarBannerNotif(false); }}
              style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 99, backgroundColor: "var(--gold)", color: "#0c0c0e", border: "none", cursor: "pointer" }}>
              Activar
            </button>
          </div>
        </div>
      )}

      {/* ── FILTROS ── */}
      <div style={{ display: "flex", gap: 20, padding: "16px 20px 10px" }}>
        {(["todos", "gastos", "ingresos"] as Filtro[]).map((f) => {
          const activo = filtro === f;
          return (
            <button key={f} onClick={() => setFiltro(f)} style={{
              fontSize: 13, fontWeight: activo ? 700 : 500,
              color: activo ? "var(--text-1)" : "var(--text-3)",
              background: "none", border: "none", padding: 0, cursor: "pointer",
              position: "relative", paddingBottom: 6, transition: "color 0.15s",
            }}>
              {f === "todos" ? "Recientes" : f === "gastos" ? "Gastos" : "Ingresos"}
              {activo && (
                <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1.5, borderRadius: 99, backgroundColor: "var(--gold)" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── LISTA AGRUPADA ── */}
      <div style={{ padding: "0 20px 120px" }}>
        {cargando ? (
          <div style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
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
          <div style={{ textAlign: "center", padding: "48px 20px", borderRadius: 20, backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 20 }}>💳</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>Sin movimientos</p>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>Toca + para registrar tu primer gasto</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {grupos.map(([fecha, txs]) => (
              <div key={fecha}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    {fecha}
                  </p>
                  <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-2)" }} />
                </div>
                <div style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  {txs.map((t, idx) => {
                    const emoji = t.tipo === "ingreso" ? "💰" : (CAT_ICON[t.categoria] || "📦");
                    const esIngreso = t.tipo === "ingreso";
                    return (
                      <div key={t.id} onClick={() => setTransaccionEditar(t)} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "13px 16px", cursor: "pointer",
                        borderBottom: idx < txs.length - 1 ? "1px solid var(--border-2)" : "none",
                        transition: "background-color 0.1s",
                      }}
                        onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-2)")}
                        onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                          {emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {t.descripcion || t.categoria || "Sin descripción"}
                          </p>
                          {t.categoria && t.descripcion && (
                            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{t.categoria}</p>
                          )}
                        </div>
                        <p className="font-number" style={{ fontSize: 13, fontWeight: 600, flexShrink: 0, color: esIngreso ? "var(--success)" : "var(--text-1)" }}>
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
      <button onClick={() => setMostrarFormulario(true)}
        className="active:scale-95 transition-transform"
        style={{
          position: "fixed", bottom: 76, right: 20,
          width: 50, height: 50, borderRadius: 16,
          backgroundColor: "var(--gold)", color: "#0c0c0e",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-gold)",
        }}>
        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 18, height: 18 }}>
          <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
        </svg>
      </button>

      {mostrarFormulario && (
        <NuevaTransaccion onCerrar={() => setMostrarFormulario(false)} onGuardado={() => { setMostrarFormulario(false); cargar(); }} />
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
