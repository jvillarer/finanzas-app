"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import {
  getQuincenaActual,
  filtrarPorQuincena,
} from "@/lib/quincena";
import { calcularRacha } from "@/lib/gamificacion";
import type { Transaccion } from "@/lib/supabase";
import { createClient } from "@/lib/supabase";

const CAT_ICON: Record<string, string> = {
  Comida: "🍽", Supermercado: "🛒", Transporte: "🚗",
  Entretenimiento: "🎬", Salud: "💊", Servicios: "⚡",
  Ropa: "👕", Hogar: "🏠", Educación: "📚", Otros: "📦",
};

type Modo = "mes" | "quincena";

function Skel({ w, h, r = "8px" }: { w: string; h: string; r?: string }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />;
}

const VERDE = "#0F2F2F";
const VERDE_SOFT = "#1f4640";
const CREMA = "#f5f1ea";

function MetricaRing({ valor, label, display, color, grande = false }: {
  valor: number; label: string; display: string; color: string; grande?: boolean;
}) {
  const radio = grande ? 28 : 18;
  const grosor = grande ? 6 : 4.5;
  const tam = grande ? 74 : 52;
  const cx = tam / 2;
  const circunferencia = 2 * Math.PI * radio;
  const offset = circunferencia * (1 - Math.min(Math.max(valor, 0), 100) / 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: tam, height: tam }}>
        <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cx} r={radio} fill="none" stroke="rgba(15,47,47,0.08)" strokeWidth={grosor} />
          <circle
            cx={cx} cy={cx} r={radio} fill="none" stroke={color}
            strokeWidth={grosor} strokeLinecap="round"
            strokeDasharray={`${circunferencia} ${circunferencia}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <p style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: grande ? 19 : 13, fontWeight: 700, color, lineHeight: 1,
            letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums",
          }}>
            {display}
          </p>
          {grande && (
            <p style={{ fontSize: 8, fontWeight: 700, color, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>
              {label}
            </p>
          )}
        </div>
      </div>
      {!grande && (
        <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(15,47,47,0.5)", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center" }}>
          {label}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [iniciales, setIniciales] = useState("??");
  const [modo, setModo] = useState<Modo>("mes");
  const [insight, setInsight] = useState<string | null>(null);
  const [insightCargando, setInsightCargando] = useState(false);
  const [insightExpandido, setInsightExpandido] = useState(false);
  const [mesOffset, setMesOffset] = useState(0);
  const [alertasDismissed, setAlertasDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("lani_alertas_vistas") || "[]"); } catch { return []; }
  });

  const cargar = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace("/login"); return; }

      const [datos, perfilData] = await Promise.all([
        obtenerTransacciones(),
        supabase.from("perfiles").select("nombre_completo").eq("id", user.id).maybeSingle(),
      ]);

      const nombreCompleto =
        (perfilData?.data as { nombre_completo?: string } | null)?.nombre_completo ||
        (user?.user_metadata?.nombre_completo as string | undefined);
      if (nombreCompleto) {
        setNombre(nombreCompleto.split(" ")[0]);
        setIniciales(nombreCompleto.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase());
      }

      setTransacciones(datos);
      if (datos.length >= 5) cargarInsight(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarInsight = async (datos: typeof transacciones) => {
    const cacheKey = "lani_insight_fecha";
    const hoyStr = new Date().toISOString().split("T")[0];
    const guardado = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
    const [fechaGuardada, insightGuardado] = guardado ? guardado.split("|||") : [];
    if (fechaGuardada === hoyStr && insightGuardado) { setInsight(insightGuardado); return; }
    setInsightCargando(true);
    try {
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const txsMes = datos.filter((t) => new Date(t.fecha + "T12:00:00") >= inicioMes);
      const gastosMes = txsMes.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
      const ingresosMes = txsMes.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
      const porCat: Record<string, number> = {};
      txsMes.filter((t) => t.tipo === "gasto").forEach((t) => {
        const c = t.categoria || "Otros";
        porCat[c] = (porCat[c] || 0) + Number(t.monto);
      });
      const topCat = Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([c, m]) => `${c}: $${m.toFixed(0)}`).join(", ");
      const diaActual = hoy.getDate();
      const diasEnMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
      const mesLabel = hoy.toLocaleString("es-MX", { month: "long" });
      const resumen = `Mes: ${mesLabel}. Día ${diaActual} de ${diasEnMes}. Ingresos: $${ingresosMes.toFixed(0)}. Gastos: $${gastosMes.toFixed(0)}. Balance: $${(ingresosMes - gastosMes).toFixed(0)}. Top categorías: ${topCat || "sin datos"}. Transacciones: ${txsMes.length}.`;
      const res = await fetch("/api/insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumen }) });
      const { insight: txt } = await res.json();
      if (txt) { setInsight(txt); localStorage.setItem(cacheKey, `${hoyStr}|||${txt}`); }
    } catch { /* silencioso */ } finally { setInsightCargando(false); }
  };

  useEffect(() => {
    void cargar();
    const handleVisibilityChange = () => { if (document.visibilityState === "visible") void cargar(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // ── Periodo ────────────────────────────────────────────────────────
  const quinc = useMemo(() => getQuincenaActual(), []);
  const hoyDate = new Date();

  const { mesSeleccionado, inicioMesSel, finMesSel } = useMemo(() => {
    const sel = new Date(hoyDate.getFullYear(), hoyDate.getMonth() + mesOffset, 1);
    return {
      mesSeleccionado: sel,
      inicioMesSel: sel,
      finMesSel: new Date(sel.getFullYear(), sel.getMonth() + 1, 0, 23, 59, 59),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesOffset]);

  const txsMesActual = useMemo(() => transacciones.filter((t) => {
    const f = new Date(t.fecha + "T12:00:00");
    return f >= inicioMesSel && f <= finMesSel;
  }), [transacciones, inicioMesSel, finMesSel]);

  const txsVista = useMemo(() =>
    modo === "quincena" && mesOffset === 0
      ? filtrarPorQuincena(transacciones, quinc)
      : txsMesActual,
  [modo, mesOffset, transacciones, quinc, txsMesActual]);

  const { ingresos, gastos, balance } = useMemo(() => calcularResumen(txsVista), [txsVista]);

  // Días restantes del mes actual
  const { diaActual, diasEnMes, diasRestantes } = useMemo(() => {
    const hoy = new Date();
    const dia = hoy.getDate();
    const total = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    return { diaActual: dia, diasEnMes: total, diasRestantes: total - dia };
  }, []);

  // ── Score Financiero ──────────────────────────────────────────────
  const scoreFinanciero = useMemo(() => {
    const ingMes = txsMesActual.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
    const gasMes = txsMesActual.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
    if (ingMes === 0 && gasMes === 0) return null;

    const sinIngresos = ingMes === 0 && gasMes > 0;
    if (sinIngresos) {
      const NEUTRAL = "rgba(15,47,47,0.25)";
      return {
        pts: 0, color: NEUTRAL, label: "Sin ingresos",
        metricas: [
          { valor: 0, label: "Ahorro", display: "—", color: NEUTRAL },
          { valor: 0, label: "Control", display: "—", color: NEUTRAL },
        ],
      };
    }

    const tasaAhorro = ingMes > 0 ? Math.max(0, Math.min(100, ((ingMes - gasMes) / ingMes) * 100)) : 0;
    const ptsAhorro = tasaAhorro > 20 ? 30 : tasaAhorro > 10 ? 20 : tasaAhorro > 0 ? 10 : 0;
    const ratioGasto = ingMes > 0 ? gasMes / ingMes : (gasMes > 0 ? 1.5 : 0);
    const controlPct = Math.max(0, Math.min(100, (1 - ratioGasto) * 100));
    const ptsControl = controlPct > 50 ? 40 : controlPct > 30 ? 32 : controlPct > 15 ? 22 : controlPct > 0 ? 10 : 0;

    const hoy = new Date();
    const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const gasMesAnt = transacciones
      .filter(t => { const f = new Date(t.fecha + "T12:00:00"); return t.tipo === "gasto" && f >= inicioMesAnt && f <= finMesAnt; })
      .reduce((s, t) => s + Number(t.monto), 0);
    const diaHoy = hoy.getDate();
    const diasMesAnt = finMesAnt.getDate();
    let ptsTendencia = 0;
    if (gasMesAnt > 0 && diaHoy > 0) {
      const gastoProyectado = (gasMes / diaHoy) * diasMesAnt;
      const tendenciaPct = Math.max(0, Math.min(100, 50 - ((gastoProyectado - gasMesAnt) / gasMesAnt) * 100));
      ptsTendencia = tendenciaPct > 65 ? 15 : tendenciaPct > 50 ? 10 : tendenciaPct > 35 ? 5 : 0;
    }

    const porCat: Record<string, number> = {};
    txsMesActual.filter(t => t.tipo === "gasto").forEach(t => {
      porCat[t.categoria || "Otros"] = (porCat[t.categoria || "Otros"] || 0) + Number(t.monto);
    });
    const nCats = Object.keys(porCat).length;
    const maxCat = gasMes > 0 && nCats > 0 ? Math.max(...Object.values(porCat)) : 0;
    const diversPct = Math.max(0, Math.min(100, (1 - (gasMes > 0 ? maxCat / gasMes : 0)) * 100 * (nCats > 1 ? 1.2 : 1)));
    const ptsDivers = diversPct > 65 ? 10 : diversPct > 40 ? 7 : diversPct > 20 ? 3 : 0;
    const habitoPct = Math.min(100, (txsMesActual.length / 25) * 100);
    const ptsHabito = habitoPct >= 80 ? 15 : habitoPct >= 40 ? 10 : habitoPct >= 16 ? 5 : 0;

    const pts = Math.min(100, ptsControl + ptsAhorro + ptsTendencia + ptsDivers + ptsHabito);
    const color = pts >= 75 ? "var(--success)" : pts >= 50 ? "#f59e0b" : "var(--danger)";
    const label = pts >= 80 ? "Excelente" : pts >= 65 ? "Bueno" : pts >= 50 ? "Regular" : pts >= 35 ? "En riesgo" : "Crítico";

    return {
      pts, color, label,
      metricas: [
        {
          valor: Math.round(tasaAhorro), label: "Ahorro", display: `${Math.round(tasaAhorro)}%`,
          color: tasaAhorro > 15 ? "var(--success)" : tasaAhorro > 5 ? "#f59e0b" : "var(--danger)",
        },
        {
          valor: Math.round(controlPct), label: "Control", display: `${Math.round(controlPct)}%`,
          color: controlPct > 35 ? "var(--success)" : controlPct > 15 ? "#f59e0b" : "var(--danger)",
        },
      ],
    };
  }, [txsMesActual, transacciones]);

  // ── Alerta más urgente ────────────────────────────────────────────
  const alertaUrgente = useMemo(() => {
    if (mesOffset !== 0) return null;
    const hoy = new Date();
    const ingMes = txsMesActual.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
    const gasMes = txsMesActual.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
    const diaHoy = hoy.getDate();
    if (ingMes > 0 && gasMes > 0 && diaHoy >= 5) {
      const gastoPromDiario = gasMes / diaHoy;
      const diasRestMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() - diaHoy;
      const gastoProyectado = gasMes + gastoPromDiario * diasRestMes;
      if (gastoProyectado > ingMes * 1.05) {
        const diasHastaLimite = Math.floor((ingMes - gasMes) / gastoPromDiario);
        if (diasHastaLimite > 0 && diasHastaLimite <= 18) {
          const id = `limite-${hoy.getFullYear()}-${hoy.getMonth()}`;
          if (!alertasDismissed.includes(id)) {
            const fechaLimite = new Date(hoy);
            fechaLimite.setDate(hoy.getDate() + diasHastaLimite);
            return {
              id,
              mensaje: `A este ritmo, el dinero alcanza hasta el día ${fechaLimite.getDate()}`,
              detalle: `Gasto proyectado: ${formatearMonto(gastoProyectado)} vs ${formatearMonto(ingMes)} de ingresos`,
            };
          }
        }
      }
    }
    // Spike semanal
    const diaSemana = hoy.getDay();
    const inicioSemAct = new Date(hoy); inicioSemAct.setDate(hoy.getDate() - diaSemana); inicioSemAct.setHours(0,0,0,0);
    const inicioSemAnt = new Date(inicioSemAct); inicioSemAnt.setDate(inicioSemAct.getDate() - 7);
    const catAct: Record<string, number> = {};
    const catAnt: Record<string, number> = {};
    for (const t of transacciones) {
      if (t.tipo !== "gasto") continue;
      const f = new Date(t.fecha + "T12:00:00");
      const cat = t.categoria || "Otros";
      if (f >= inicioSemAct && f <= hoy) catAct[cat] = (catAct[cat] || 0) + Number(t.monto);
      if (f >= inicioSemAnt && f < inicioSemAct) catAnt[cat] = (catAnt[cat] || 0) + Number(t.monto);
    }
    for (const cat of Object.keys(catAct)) {
      const actual = catAct[cat]; const anterior = catAnt[cat] || 0;
      if (anterior > 100 && actual > anterior * 1.4 && actual > 250) {
        const id = `spike-${cat}-${inicioSemAct.toISOString().split("T")[0]}`;
        if (!alertasDismissed.includes(id)) {
          return {
            id, mensaje: `${(actual / anterior).toFixed(1)}x más en ${cat} esta semana`,
            detalle: `${formatearMonto(actual)} vs ${formatearMonto(anterior)} la semana pasada`,
          };
        }
      }
    }
    return null;
  }, [transacciones, txsMesActual, alertasDismissed, mesOffset]);

  const dismissAlerta = (id: string) => {
    const nuevas = [...alertasDismissed, id];
    setAlertasDismissed(nuevas);
    localStorage.setItem("lani_alertas_vistas", JSON.stringify(nuevas));
  };

  // ── Top 3 categorías de gasto del mes ────────────────────────────
  const topCategorias = useMemo(() => {
    const gastoTotal = txsVista.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
    if (gastoTotal === 0) return [];
    const porCat: Record<string, number> = {};
    txsVista.filter(t => t.tipo === "gasto").forEach(t => {
      const c = t.categoria || "Otros";
      porCat[c] = (porCat[c] || 0) + Number(t.monto);
    });
    return Object.entries(porCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, monto]) => ({ cat, monto, pct: Math.round((monto / gastoTotal) * 100) }));
  }, [txsVista]);

  const racha = useMemo(() => calcularRacha(transacciones), [transacciones]);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const periodoLabel = modo === "quincena" && mesOffset === 0
    ? quinc.label
    : mesSeleccionado.toLocaleString("es-MX", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)", paddingBottom: 90 }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "28px 22px 6px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 13, color: "rgba(15,47,47,0.55)", fontWeight: 500, letterSpacing: "0.1px" }}>{saludo},</p>
            {/* Badge racha */}
            {!cargando && racha.activa && (
              <div style={{
                display: "flex", alignItems: "center", gap: 3,
                padding: "2px 8px", borderRadius: 99,
                backgroundColor: racha.enRiesgo ? "rgba(15,47,47,0.06)" : "rgba(255,160,0,0.12)",
                border: `1px solid ${racha.enRiesgo ? "rgba(15,47,47,0.1)" : "rgba(255,160,0,0.25)"}`,
              }}>
                <span style={{ fontSize: 11 }}>🔥</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: racha.enRiesgo ? "rgba(15,47,47,0.4)" : "#d97706" }}>
                  {racha.dias}
                </span>
              </div>
            )}
          </div>
          <h1 style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            fontSize: 34, fontWeight: 800, color: VERDE,
            letterSpacing: "-0.6px", lineHeight: 1, marginTop: 2,
          }}>
            {cargando ? <Skel w="100px" h="34px" r="8px" /> : (nombre || "Mis finanzas")}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => router.push("/buscar")}
            className="active:opacity-50 transition-opacity"
            style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "#ffffff", border: "1px solid rgba(15,47,47,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={VERDE} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/perfil")}
            className="active:opacity-50 transition-opacity"
            style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: VERDE, color: "#ffffff", fontSize: 14, fontWeight: 700, letterSpacing: "-0.2px", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
          >
            {iniciales}
          </button>
        </div>
      </div>

      {/* ── BALANCE HERO ── */}
      <div style={{ padding: "10px 14px 0" }}>
        <div style={{
          background: VERDE,
          borderRadius: 24,
          padding: "14px 18px 16px",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(15,47,47,0.18)",
        }}>
          {/* Decoración Lani peek */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Lani_Saludando_ec67ff06.png"
            alt=""
            style={{ position: "absolute", right: -20, bottom: -10, width: 120, height: 120, objectFit: "contain", opacity: 0.22, pointerEvents: "none" }}
          />

          {/* Selector de periodo */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setMesOffset((o) => o - 1)}
                style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#ffffff" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", color: "rgba(255,255,255,0.85)", textTransform: "uppercase" }}>
                {periodoLabel}
              </span>
              <button
                onClick={() => setMesOffset((o) => Math.min(0, o + 1))}
                disabled={mesOffset === 0}
                style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: mesOffset === 0 ? "default" : "pointer", color: "#ffffff", opacity: mesOffset === 0 ? 0.3 : 1 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
            {mesOffset === 0 && (
              <div style={{ display: "flex", background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 3 }}>
                {(["mes", "quincena"] as Modo[]).map((m) => (
                  <button key={m} onClick={() => setModo(m)} style={{
                    background: modo === m ? "#ffffff" : "transparent",
                    color: modo === m ? VERDE : "rgba(255,255,255,0.9)",
                    border: "none", borderRadius: 11, padding: "4px 10px",
                    fontSize: 10, fontWeight: modo === m ? 700 : 500, letterSpacing: "0.5px",
                    cursor: "pointer",
                  }}>
                    {m === "mes" ? "MES" : "QUINC."}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Balance grande */}
          <div style={{ marginTop: 10, position: "relative", zIndex: 1 }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontWeight: 600, letterSpacing: "0.6px", textTransform: "uppercase" }}>
              Balance del mes
            </p>
            {cargando ? <Skel w="200px" h="44px" r="10px" /> : (
              <h2 style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                fontSize: 42, fontWeight: 800,
                color: balance < 0 ? "#ff8a7a" : "#ffffff",
                marginTop: 2, letterSpacing: "-1.5px", lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}>
                {balance < 0 ? `−${formatearMonto(Math.abs(balance))}` : formatearMonto(balance)}
              </h2>
            )}
            {!cargando && mesOffset === 0 && modo === "mes" && (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 4, fontWeight: 500 }}>
                Día {diaActual} de {diasEnMes} · {diasRestantes === 0 ? "último día" : `quedan ${diasRestantes} días`}
              </p>
            )}
          </div>

          {/* Ingresos / Gastos mini cards */}
          <div style={{ marginTop: 10, display: "flex", gap: 8, position: "relative", zIndex: 1 }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "7px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7dd3a8" }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>Ingresos</span>
              </div>
              {cargando ? <Skel w="70px" h="16px" r="6px" /> : (
                <p style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginTop: 2, letterSpacing: "-0.3px" }}>
                  +{formatearMonto(ingresos)}
                </p>
              )}
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "7px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff8a7a" }} />
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>Gastos</span>
              </div>
              {cargando ? <Skel w="70px" h="16px" r="6px" /> : (
                <p style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginTop: 2, letterSpacing: "-0.3px" }}>
                  −{formatearMonto(gastos)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCORE: 3 rings ── */}
      {!cargando && scoreFinanciero && mesOffset === 0 && (
        <div style={{ padding: "8px 14px 0", display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: "10px 8px 10px", borderRadius: 18, backgroundColor: "#ffffff", border: "1px solid rgba(15,47,47,0.06)", boxShadow: "0 1px 3px rgba(15,47,47,0.04)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(15,47,47,0.5)" }}>Ahorro</span>
            <MetricaRing valor={scoreFinanciero.metricas[0].valor} label="" display={scoreFinanciero.metricas[0].display} color={scoreFinanciero.metricas[0].color} />
          </div>
          <div style={{ flex: 1.4, padding: "10px 8px 10px", borderRadius: 18, backgroundColor: "#ffffff", border: "1px solid rgba(15,47,47,0.06)", boxShadow: "0 1px 3px rgba(15,47,47,0.04)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative" }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(15,47,47,0.5)" }}>Score</span>
            <MetricaRing valor={scoreFinanciero.pts} label={scoreFinanciero.label} display={`${scoreFinanciero.pts}%`} color={scoreFinanciero.color} grande />
          </div>
          <div style={{ flex: 1, padding: "10px 8px 10px", borderRadius: 18, backgroundColor: "#ffffff", border: "1px solid rgba(15,47,47,0.06)", boxShadow: "0 1px 3px rgba(15,47,47,0.04)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "rgba(15,47,47,0.5)" }}>Control</span>
            <MetricaRing valor={scoreFinanciero.metricas[1].valor} label="" display={scoreFinanciero.metricas[1].display} color={scoreFinanciero.metricas[1].color} />
          </div>
        </div>
      )}

      {/* ── LANI INSIGHT ── */}
      {(insight || insightCargando) && (
        <div style={{ padding: "8px 14px 0" }}>
          <div style={{
            background: CREMA,
            borderRadius: 18,
            padding: "10px 12px",
            display: "flex", gap: 10, alignItems: "flex-start",
            border: "1px solid rgba(15,47,47,0.06)",
          }}>
            {/* Avatar Lani */}
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#ffffff", flexShrink: 0,
              border: "1.5px solid rgba(15,47,47,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Lani_Saludando_ec67ff06.png" alt="Lani" style={{ width: "90%", height: "90%", objectFit: "contain" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: VERDE, letterSpacing: "-0.1px" }}>Lani dice</span>
                <span style={{ fontSize: 10, color: "rgba(15,47,47,0.4)", fontWeight: 500 }}>hoy</span>
              </div>
              {insightCargando ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center", paddingTop: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="animate-bounce" style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: VERDE, display: "block", animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              ) : (
                <div>
                  <p style={{
                    fontSize: 13, lineHeight: "18px", color: VERDE_SOFT, fontWeight: 450,
                    display: "-webkit-box", WebkitBoxOrient: "vertical",
                    WebkitLineClamp: insightExpandido ? undefined : 2,
                    overflow: insightExpandido ? "visible" : "hidden",
                  }}>{insight}</p>
                  {insight && insight.length > 80 && (
                    <button
                      onClick={() => setInsightExpandido(!insightExpandido)}
                      style={{ background: "none", border: "none", padding: "4px 0 0", cursor: "pointer", fontSize: 12, fontWeight: 600, color: VERDE, opacity: 0.6 }}
                    >
                      {insightExpandido ? "Ver menos" : "Ver más"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TOP CATEGORÍAS ── */}
      {!cargando && topCategorias.length > 0 && (
        <div style={{ padding: "8px 14px 0" }}>
          <div style={{
            background: "#ffffff",
            borderRadius: 18,
            padding: "12px 14px 10px",
            border: "1px solid rgba(15,47,47,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: VERDE, letterSpacing: "-0.2px" }}>En qué gastas más</h3>
              <span style={{ fontSize: 11, color: "rgba(15,47,47,0.45)", fontWeight: 500 }}>este periodo</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {topCategorias.map(({ cat, monto, pct }) => (
                <div key={cat}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{CAT_ICON[cat] || "📦"}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: VERDE }}>{cat}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "rgba(15,47,47,0.5)", fontWeight: 500 }}>
                        {formatearMonto(monto)}
                      </span>
                      <span style={{
                        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                        fontSize: 14, fontWeight: 700, color: VERDE,
                        letterSpacing: "-0.3px", fontVariantNumeric: "tabular-nums",
                      }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: "rgba(15,47,47,0.06)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${pct}%`,
                      background: VERDE, borderRadius: 4,
                      transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ALERTA URGENTE ── */}
      {!cargando && alertaUrgente && (
        <div style={{ padding: "8px 14px 0" }}>
          <div style={{ padding: "12px 14px", borderRadius: 16, backgroundColor: "#fff8f7", border: "1px solid rgba(200,80,62,0.2)", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.6 }}>⚡</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: VERDE, lineHeight: 1.4 }}>{alertaUrgente.mensaje}</p>
              <p style={{ fontSize: 11, color: "rgba(15,47,47,0.5)", marginTop: 2 }}>{alertaUrgente.detalle}</p>
            </div>
            <button onClick={() => dismissAlerta(alertaUrgente.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0 0 4px", flexShrink: 0 }}>
              <svg viewBox="0 0 14 14" fill="none" stroke="rgba(15,47,47,0.4)" strokeWidth={1.8} strokeLinecap="round" style={{ width: 13, height: 13 }}>
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
