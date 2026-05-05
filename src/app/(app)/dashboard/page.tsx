"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import {
  getQuincenaActual,
  filtrarPorQuincena,
} from "@/lib/quincena";
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

function MetricaRing({ valor, label, display, color, grande = false }: {
  valor: number; label: string; display: string; color: string; grande?: boolean;
}) {
  const radio = grande ? 34 : 22;
  const grosor = grande ? 7 : 5.5;
  const tam = grande ? 84 : 56;
  const cx = tam / 2;
  const circunferencia = 2 * Math.PI * radio;
  const offset = circunferencia * (1 - Math.min(Math.max(valor, 0), 100) / 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: tam, height: tam }}>
        <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cx} r={radio} fill="none" stroke="var(--surface-3)" strokeWidth={grosor} />
          <circle
            cx={cx} cy={cx} r={radio} fill="none" stroke={color}
            strokeWidth={grosor} strokeLinecap="round"
            strokeDasharray={`${circunferencia} ${circunferencia}`}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <p className="font-number" style={{ fontSize: grande ? 22 : 12, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.03em" }}>
            {display}
          </p>
          {grande && (
            <p style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              {label}
            </p>
          )}
        </div>
      </div>
      {!grande && (
        <p style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "center" }}>
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
  const spendingPct = ingresos > 0 ? Math.min((gastos / ingresos) * 100, 100) : 0;
  const spendingColor = spendingPct >= 90 ? "var(--danger)" : spendingPct >= 70 ? "var(--warning)" : "var(--gold)";

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
      return {
        pts: 0, color: "var(--danger)", label: "Crítico",
        metricas: [
          { valor: 0, label: "Ahorro", display: "0%", color: "var(--danger)" },
          { valor: 0, label: "Control", display: "0%", color: "var(--danger)" },
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

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const periodoLabel = modo === "quincena" && mesOffset === 0
    ? quinc.label
    : mesSeleccionado.toLocaleString("es-MX", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)", paddingBottom: 100 }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "56px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{saludo}</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", lineHeight: 1.2, marginTop: 1 }}>
            {cargando ? <Skel w="100px" h="26px" /> : (nombre || "Mis finanzas")}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => router.push("/buscar")}
            className="active:opacity-50 transition-opacity"
            style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="var(--text-3)" strokeWidth={1.6} strokeLinecap="round" style={{ width: 15, height: 15 }}>
              <circle cx="8.5" cy="8.5" r="5.5" /><path d="M15 15l-2.5-2.5" />
            </svg>
          </button>
          <button
            onClick={() => router.push("/perfil")}
            className="active:opacity-50 transition-opacity"
            style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "1px solid var(--gold-border)", color: "var(--gold)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {iniciales}
          </button>
        </div>
      </div>

      {/* ── BALANCE HERO ── */}
      <div style={{ padding: "20px 20px 16px" }}>

        {/* Selector de periodo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setMesOffset((o) => o - 1)}
              style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth={1.8} strokeLinecap="round" style={{ width: 10, height: 10 }}><path d="M7.5 9L4.5 6l3-3" /></svg>
            </button>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: mesOffset === 0 ? "var(--gold)" : "var(--text-2)" }}>
              {periodoLabel}
            </p>
            <button
              onClick={() => setMesOffset((o) => Math.min(0, o + 1))}
              disabled={mesOffset === 0}
              style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: mesOffset === 0 ? "default" : "pointer", opacity: mesOffset === 0 ? 0.25 : 1 }}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth={1.8} strokeLinecap="round" style={{ width: 10, height: 10 }}><path d="M4.5 9L7.5 6l-3-3" /></svg>
            </button>
          </div>
          {mesOffset === 0 && (
            <div style={{ display: "flex", gap: 3 }}>
              {(["mes", "quincena"] as Modo[]).map((m) => (
                <button key={m} onClick={() => setModo(m)} style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "3px 9px", borderRadius: 99,
                  backgroundColor: modo === m ? "var(--surface-3)" : "transparent",
                  color: modo === m ? "var(--text-1)" : "var(--text-3)",
                  border: modo === m ? "1px solid var(--border)" : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                  {m === "mes" ? "Mes" : "Quinc."}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Balance grande */}
        {cargando ? <Skel w="200px" h="52px" r="10px" /> : (
          <p className="font-display" style={{
            fontSize: "clamp(42px, 11vw, 54px)", fontWeight: 400, fontStyle: "italic",
            color: balance < 0 ? "var(--danger)" : "var(--text-1)",
            letterSpacing: "-0.025em", lineHeight: 1,
          }}>
            {formatearMonto(balance)}
          </p>
        )}

        {/* Días restantes — solo en mes actual */}
        {!cargando && mesOffset === 0 && modo === "mes" && (
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, fontWeight: 500 }}>
            Día {diaActual} de {diasEnMes} · {diasRestantes === 0 ? "último día" : `quedan ${diasRestantes} días`}
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

        {/* Barra de progreso */}
        {!cargando && ingresos > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>
                {spendingPct >= 90 ? "⚠ Casi al límite" : spendingPct >= 70 ? "Ojo con los gastos" : "Vas bien"}
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

      {/* ── SCORE: 3 rings ── */}
      {!cargando && scoreFinanciero && mesOffset === 0 && (
        <div style={{ padding: "0 20px 8px", display: "flex", gap: 8 }}>
          <div style={{ flex: 1, padding: "14px 10px 12px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>Ahorro</p>
            <MetricaRing valor={scoreFinanciero.metricas[0].valor} label="" display={scoreFinanciero.metricas[0].display} color={scoreFinanciero.metricas[0].color} />
          </div>
          <div style={{ flex: 1.4, padding: "14px 10px 12px", borderRadius: 16, backgroundColor: "var(--surface)", border: `1px solid ${scoreFinanciero.color}44`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>Score</p>
            <MetricaRing valor={scoreFinanciero.pts} label={scoreFinanciero.label} display={`${scoreFinanciero.pts}%`} color={scoreFinanciero.color} grande />
          </div>
          <div style={{ flex: 1, padding: "14px 10px 12px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>Control</p>
            <MetricaRing valor={scoreFinanciero.metricas[1].valor} label="" display={scoreFinanciero.metricas[1].display} color={scoreFinanciero.metricas[1].color} />
          </div>
        </div>
      )}

      {/* ── LANI INSIGHT ── */}
      {(insight || insightCargando) && (
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{ padding: "12px 14px", borderRadius: 14, backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>💡</span>
            {insightCargando ? (
              <div style={{ display: "flex", gap: 4, alignItems: "center", paddingTop: 4 }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="animate-bounce" style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--gold)", display: "block", animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>{insight}</p>
            )}
          </div>
        </div>
      )}

      {/* ── TOP CATEGORÍAS ── */}
      {!cargando && topCategorias.length > 0 && (
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{ padding: "14px 16px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>En qué gastas más</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)" }}>este periodo</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {topCategorias.map(({ cat, monto, pct }) => (
                <div key={cat}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
                      {CAT_ICON[cat] || "📦"} {cat}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="font-number" style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {formatearMonto(monto)}
                      </span>
                      <span className="font-number" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", minWidth: 28, textAlign: "right" }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div style={{ width: "100%", height: 4, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
                    <div style={{
                      height: 4, borderRadius: 99,
                      width: `${pct}%`,
                      backgroundColor: "var(--gold)",
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
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{ padding: "11px 14px", borderRadius: 14, backgroundColor: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.6 }}>⚡</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.4 }}>{alertaUrgente.mensaje}</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{alertaUrgente.detalle}</p>
            </div>
            <button onClick={() => dismissAlerta(alertaUrgente.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0 0 4px", flexShrink: 0 }}>
              <svg viewBox="0 0 14 14" fill="none" stroke="var(--text-3)" strokeWidth={1.8} strokeLinecap="round" style={{ width: 13, height: 13 }}>
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
