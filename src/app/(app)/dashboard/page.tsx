"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import { calcularProyeccion } from "@/lib/proyeccion";
import { detectarRecurrentes, totalRecurrentes } from "@/lib/recurrentes";
import {
  getQuincenaActual,
  filtrarPorQuincena,
  calcularProyeccionQuincena,
} from "@/lib/quincena";
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
  const [modo, setModo] = useState<Modo>("mes");
  const [paginaLista, setPaginaLista] = useState(30);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightCargando, setInsightCargando] = useState(false);
  const [mesOffset, setMesOffset] = useState(0); // 0 = este mes, -1 = mes anterior, etc.
  const [alertasDismissed, setAlertasDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("lani_alertas_vistas") || "[]"); } catch { return []; }
  });

  const cargar = useCallback(async () => {
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
      // Insight solo si hay transacciones suficientes
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
    // Reusar insight del mismo día
    if (fechaGuardada === hoyStr && insightGuardado) {
      setInsight(insightGuardado);
      return;
    }
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

      const resumen = `Mes: ${mesLabel}. Día ${diaActual} de ${diasEnMes}. Ingresos: $${ingresosMes.toFixed(0)}. Gastos: $${gastosMes.toFixed(0)}. Balance: $${(ingresosMes - gastosMes).toFixed(0)}. Top categorías de gasto: ${topCat || "sin datos"}. Total transacciones este mes: ${txsMes.length}.`;

      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumen }),
      });
      const { insight: txt } = await res.json();
      if (txt) {
        setInsight(txt);
        localStorage.setItem(cacheKey, `${hoyStr}|||${txt}`);
      }
    } catch { /* silencioso */ } finally {
      setInsightCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
    registrarServiceWorker();
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => setMostrarBannerNotif(true), 5000);
    }
  }, []);

  // ── Periodo activo ────────────────────────────────────────────────
  const quinc = useMemo(() => getQuincenaActual(), []);
  const hoyDate = new Date();

  // Mes seleccionado según offset (0 = este mes, -1 = mes anterior, etc.)
  const { mesSeleccionado, inicioMesSel, finMesSel } = useMemo(() => {
    const sel = new Date(hoyDate.getFullYear(), hoyDate.getMonth() + mesOffset, 1);
    return {
      mesSeleccionado: sel,
      inicioMesSel: sel,
      finMesSel: new Date(sel.getFullYear(), sel.getMonth() + 1, 0),
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

  // Proyección solo para el mes/quincena actual (O(n) — solo recalcular cuando cambian las txs)
  const proyeccionMes = useMemo(() => calcularProyeccion(transacciones), [transacciones]);
  const proyeccionQ = useMemo(() => calcularProyeccionQuincena(transacciones, quinc), [transacciones, quinc]);

  // detectarRecurrentes es O(n²) — memoizar para que no corra en cada render
  const recurrentes = useMemo(() => detectarRecurrentes(transacciones), [transacciones]);
  const totalSuscripciones = useMemo(() => totalRecurrentes(recurrentes), [recurrentes]);

  // ── Score Financiero con 3 rings ─────────────────────────────────
  const scoreFinanciero = useMemo(() => {
    const hoy = new Date();
    const ingMes = txsMesActual.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
    const gasMes = txsMesActual.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
    if (ingMes === 0 && gasMes === 0) return null;

    const sinIngresos = ingMes === 0 && gasMes > 0;
    // Sin ingresos registrados = 0 de inmediato, no hay nada que evaluar
    if (sinIngresos) {
      return {
        pts: 0, color: "var(--danger)", label: "Crítico",
        metricas: [
          { valor: 0, label: "Ahorro", display: "0%", color: "var(--danger)" },
          { valor: 0, label: "Control", display: "0%", color: "var(--danger)" },
        ],
      };
    }

    // — Ahorro: % de ingresos guardado (ring izquierdo) —
    const tasaAhorro = ingMes > 0 ? Math.max(0, Math.min(100, ((ingMes - gasMes) / ingMes) * 100)) : 0;
    const ptsAhorro = tasaAhorro > 20 ? 30 : tasaAhorro > 10 ? 20 : tasaAhorro > 0 ? 10 : 0;

    // — Control: margen restante vs ingresos (ring derecho) —
    const ratioGasto = ingMes > 0 ? gasMes / ingMes : (gasMes > 0 ? 1.5 : 0);
    const controlPct = Math.max(0, Math.min(100, (1 - ratioGasto) * 100));
    const ptsControl = controlPct > 50 ? 40 : controlPct > 30 ? 32 : controlPct > 15 ? 22 : controlPct > 0 ? 10 : 0;

    // — Tendencia vs mes anterior (no visible como ring, suma al score) —
    const inicioMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const gasMesAnt = transacciones
      .filter(t => { const f = new Date(t.fecha + "T12:00:00"); return t.tipo === "gasto" && f >= inicioMesAnt && f <= finMesAnt; })
      .reduce((s, t) => s + Number(t.monto), 0);
    const diaHoy = hoy.getDate();
    const diasMesAnt = finMesAnt.getDate();
    let ptsTendencia = 0;
    if (!sinIngresos && gasMesAnt > 0 && diaHoy > 0) {
      const gastoProyectado = (gasMes / diaHoy) * diasMesAnt;
      const tendenciaPct = Math.max(0, Math.min(100, 50 - ((gastoProyectado - gasMesAnt) / gasMesAnt) * 100));
      ptsTendencia = tendenciaPct > 65 ? 15 : tendenciaPct > 50 ? 10 : tendenciaPct > 35 ? 5 : 0;
    }

    // — Diversificación (suma al score) —
    const porCat: Record<string, number> = {};
    txsMesActual.filter(t => t.tipo === "gasto").forEach(t => {
      porCat[t.categoria || "Otros"] = (porCat[t.categoria || "Otros"] || 0) + Number(t.monto);
    });
    const nCats = Object.keys(porCat).length;
    const maxCat = gasMes > 0 && nCats > 0 ? Math.max(...Object.values(porCat)) : 0;
    const diversPct = Math.max(0, Math.min(100, (1 - (gasMes > 0 ? maxCat / gasMes : 0)) * 100 * (nCats > 1 ? 1.2 : 1)));
    const ptsDivers = !sinIngresos ? (diversPct > 65 ? 10 : diversPct > 40 ? 7 : diversPct > 20 ? 3 : 0) : 0;

    // — Hábito de registro (solo factor que cuenta sin ingresos) —
    const habitoPct = Math.min(100, (txsMesActual.length / 25) * 100);
    // Si no hay ingresos, cap en 5 pts para no inflar el score artificialmente
    const ptsHabito = sinIngresos
      ? (habitoPct >= 16 ? 5 : 0)
      : (habitoPct >= 80 ? 15 : habitoPct >= 40 ? 10 : habitoPct >= 16 ? 5 : 0);

    const pts = Math.min(100, ptsControl + ptsAhorro + ptsTendencia + ptsDivers + ptsHabito);
    const color = pts >= 75 ? "var(--success)" : pts >= 50 ? "#f59e0b" : "var(--danger)";
    const label = pts >= 80 ? "Excelente" : pts >= 65 ? "Bueno" : pts >= 50 ? "Regular" : pts >= 35 ? "En riesgo" : "Crítico";

    const metricas = [
      {
        valor: Math.round(tasaAhorro),
        label: "Ahorro",
        display: `${Math.round(tasaAhorro)}%`,
        color: tasaAhorro > 15 ? "var(--success)" : tasaAhorro > 5 ? "#f59e0b" : "var(--danger)",
      },
      {
        valor: Math.round(controlPct),
        label: "Control",
        display: `${Math.round(controlPct)}%`,
        color: controlPct > 35 ? "var(--success)" : controlPct > 15 ? "#f59e0b" : "var(--danger)",
      },
    ];

    return { pts, color, label, metricas };
  }, [txsMesActual, transacciones]);

  // ── Alertas Inteligentes ─────────────────────────────────────────
  const alertasInteligentes = useMemo(() => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const inicioSemanaActual = new Date(hoy);
    inicioSemanaActual.setDate(hoy.getDate() - diaSemana);
    inicioSemanaActual.setHours(0, 0, 0, 0);
    const inicioSemanaAnterior = new Date(inicioSemanaActual);
    inicioSemanaAnterior.setDate(inicioSemanaActual.getDate() - 7);

    const catActual: Record<string, number> = {};
    const catAnterior: Record<string, number> = {};

    for (const t of transacciones) {
      if (t.tipo !== "gasto") continue;
      const cat = t.categoria || "Otros";
      const f = new Date(t.fecha + "T12:00:00");
      if (f >= inicioSemanaActual && f <= hoy) catActual[cat] = (catActual[cat] || 0) + Number(t.monto);
      if (f >= inicioSemanaAnterior && f < inicioSemanaActual) catAnterior[cat] = (catAnterior[cat] || 0) + Number(t.monto);
    }

    const alertas: Array<{ id: string; mensaje: string; detalle: string }> = [];

    // Detectar picos por categoría
    for (const cat of Object.keys(catActual)) {
      const actual = catActual[cat];
      const anterior = catAnterior[cat] || 0;
      if (anterior > 100 && actual > anterior * 1.4 && actual > 250) {
        const ratio = actual / anterior;
        alertas.push({
          id: `spike-${cat}-${inicioSemanaActual.toISOString().split("T")[0]}`,
          mensaje: `${ratio.toFixed(1)}x más en ${cat} esta semana`,
          detalle: `${formatearMonto(actual)} vs ${formatearMonto(anterior)} la semana pasada`,
        });
      }
    }

    // Predicción de dinero acabándose
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
          const fechaLimite = new Date(hoy);
          fechaLimite.setDate(hoy.getDate() + diasHastaLimite);
          alertas.push({
            id: `limite-${hoy.getFullYear()}-${hoy.getMonth()}`,
            mensaje: `A este ritmo, el dinero alcanza hasta el día ${fechaLimite.getDate()}`,
            detalle: `Gasto proyectado: ${formatearMonto(gastoProyectado)} vs ${formatearMonto(ingMes)} de ingresos`,
          });
        }
      }
    }

    return alertas.filter(a => !alertasDismissed.includes(a.id));
  }, [transacciones, txsMesActual, alertasDismissed]);

  const dismissAlerta = (id: string) => {
    const nuevas = [...alertasDismissed, id];
    setAlertasDismissed(nuevas);
    localStorage.setItem("lani_alertas_vistas", JSON.stringify(nuevas));
  };

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const diaFinMes = finMesSel.getDate();
  const mesCorto = mesSeleccionado.toLocaleString("es-MX", { month: "short" });
  const periodoLabel = modo === "quincena" && mesOffset === 0
    ? quinc.label
    : mesSeleccionado.toLocaleString("es-MX", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());

  // Lista filtrada por el mes seleccionado
  const listaBase = useMemo(() => txsMesActual.filter((t) =>
    filtro === "todos" ? true : filtro === "gastos" ? t.tipo === "gasto" : t.tipo === "ingreso"
  ), [txsMesActual, filtro]);
  const lista = listaBase.slice(0, paginaLista);
  const hayMas = listaBase.length > paginaLista;

  const grupos = useMemo(() => agruparPorFecha(lista), [lista]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => router.push("/buscar")}
            className="active:opacity-50 transition-opacity"
            style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="var(--text-3)" strokeWidth={1.6} strokeLinecap="round" style={{ width: 15, height: 15 }}>
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M15 15l-2.5-2.5" />
            </svg>
          </button>
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
      </div>

      {/* ── BALANCE HERO ── */}
      <div style={{ padding: "20px 20px 16px" }}>

        {/* Periodo + navegación + toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          {/* Flechas de mes */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => { setMesOffset((o) => o - 1); setPaginaLista(30); }}
              style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth={1.8} strokeLinecap="round" style={{ width: 10, height: 10 }}>
                <path d="M7.5 9L4.5 6l3-3" />
              </svg>
            </button>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: mesOffset === 0 ? "var(--gold)" : "var(--text-2)" }}>
              {periodoLabel}
            </p>
            <button
              onClick={() => { setMesOffset((o) => Math.min(0, o + 1)); setPaginaLista(30); }}
              disabled={mesOffset === 0}
              style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: mesOffset === 0 ? "default" : "pointer", opacity: mesOffset === 0 ? 0.25 : 1 }}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="var(--text-3)" strokeWidth={1.8} strokeLinecap="round" style={{ width: 10, height: 10 }}>
                <path d="M4.5 9L7.5 6l-3-3" />
              </svg>
            </button>
          </div>
          {/* Toggle mes/quincena solo en mes actual */}
          {mesOffset === 0 && (
            <div style={{ display: "flex", gap: 3 }}>
              {(["mes", "quincena"] as Modo[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setModo(m)}
                  style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "3px 9px", borderRadius: 99,
                    backgroundColor: modo === m ? "var(--surface-3)" : "transparent",
                    color: modo === m ? "var(--text-1)" : "var(--text-3)",
                    border: modo === m ? "1px solid var(--border)" : "1px solid transparent",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {m === "mes" ? "Mes" : "Quinc."}
                </button>
              ))}
            </div>
          )}
        </div>

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

      {/* ── LANI INSIGHT ── */}
      {(insight || insightCargando) && (
        <div style={{ padding: "0 20px 8px" }}>
          <div style={{
            padding: "12px 14px", borderRadius: 14,
            backgroundColor: "var(--gold-dim)",
            border: "1px solid var(--gold-border)",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>🐑</span>
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

      {/* ── SCORE FINANCIERO: 3 cards separados ── */}
      {!cargando && scoreFinanciero && mesOffset === 0 && (
        <div style={{ padding: "0 20px 8px", display: "flex", gap: 8, alignItems: "stretch" }}>
          {/* Ahorro */}
          <div style={{
            flex: 1, padding: "14px 10px 12px", borderRadius: 16,
            backgroundColor: "var(--surface)", border: "1px solid var(--border)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
              Ahorro
            </p>
            <MetricaRing
              valor={scoreFinanciero.metricas[0].valor}
              label=""
              display={scoreFinanciero.metricas[0].display}
              color={scoreFinanciero.metricas[0].color}
            />
          </div>

          {/* Score (centro, más grande) */}
          <div style={{
            flex: 1.4, padding: "14px 10px 12px", borderRadius: 16,
            backgroundColor: "var(--surface)", border: `1px solid ${scoreFinanciero.color}44`,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
              Score
            </p>
            <MetricaRing
              valor={scoreFinanciero.pts}
              label={scoreFinanciero.label}
              display={`${scoreFinanciero.pts}%`}
              color={scoreFinanciero.color}
              grande
            />
          </div>

          {/* Control */}
          <div style={{
            flex: 1, padding: "14px 10px 12px", borderRadius: 16,
            backgroundColor: "var(--surface)", border: "1px solid var(--border)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
              Control
            </p>
            <MetricaRing
              valor={scoreFinanciero.metricas[1].valor}
              label=""
              display={scoreFinanciero.metricas[1].display}
              color={scoreFinanciero.metricas[1].color}
            />
          </div>
        </div>
      )}

      {/* ── ALERTAS INTELIGENTES ── */}
      {!cargando && alertasInteligentes.length > 0 && mesOffset === 0 && (
        <div style={{ padding: "0 20px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
          {alertasInteligentes.map((alerta) => (
            <div key={alerta.id} style={{
              padding: "11px 14px", borderRadius: 14,
              backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.6 }}>⚡</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.4 }}>{alerta.mensaje}</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{alerta.detalle}</p>
              </div>
              <button
                onClick={() => dismissAlerta(alerta.id)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 0 0 4px", flexShrink: 0 }}
              >
                <svg viewBox="0 0 14 14" fill="none" stroke="var(--text-3)" strokeWidth={1.8} strokeLinecap="round" style={{ width: 13, height: 13 }}>
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── INFO CARDS: Proyección + Recurrentes ── */}
      {!cargando && (
        <div style={{ padding: "0 20px 4px", display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Proyección — mes */}
          {modo === "mes" && proyeccionMes.motivo === "ok" && proyeccionMes.proyectado !== null && (
            <div style={{
              padding: "12px 14px", borderRadius: 14,
              backgroundColor: "var(--surface)",
              border: proyeccionMes.proyectado < 0 ? "1px solid var(--danger)" : "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                  Proyección {diaFinMes} {mesCorto}
                </p>
                <p className="font-number" style={{
                  fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
                  color: proyeccionMes.proyectado >= 0 ? "var(--success)" : "var(--danger)",
                }}>
                  ~{formatearMonto(proyeccionMes.proyectado)}
                </p>
                {proyeccionMes.proyectado < 0 && (
                  <p style={{ fontSize: 10, color: "var(--danger)", marginTop: 3, fontWeight: 600 }}>
                    A este ritmo, gastas más de lo que recibes
                  </p>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.6 }}>
                  Día {proyeccionMes.diasTranscurridos} de {proyeccionMes.diasEnMes}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-3)" }}>
                  Quedan {proyeccionMes.diasRestantes} días
                </p>
              </div>
            </div>
          )}

          {/* Proyección — quincena */}
          {modo === "quincena" && proyeccionQ.motivo === "ok" && proyeccionQ.proyectado !== null && (
            <div style={{
              padding: "12px 14px", borderRadius: 14,
              backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                  Proyección fin de {quinc.numero === 1 ? "Q1" : "Q2"}
                </p>
                <p className="font-number" style={{
                  fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
                  color: proyeccionQ.proyectado >= 0 ? "var(--success)" : "var(--danger)",
                }}>
                  ~{formatearMonto(proyeccionQ.proyectado)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "var(--text-3)", lineHeight: 1.6 }}>
                  Día {quinc.diasTranscurridos} de {quinc.diasTotales}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-3)" }}>
                  Quedan {quinc.diasRestantes} días
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
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 20px 10px" }}>
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
        <button
          onClick={() => router.push("/subir-archivo")}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
            <path d="M8 10.5V2.5M5 5l3-3 3 3M3 13h10" />
          </svg>
          Importar
        </button>
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

        {/* Ver más */}
        {!cargando && hayMas && (
          <button
            onClick={() => setPaginaLista((p) => p + 30)}
            style={{
              width: "100%", padding: "13px 0", marginTop: 8, borderRadius: 14,
              fontSize: 12, fontWeight: 600,
              backgroundColor: "var(--surface)", color: "var(--text-3)",
              border: "1px solid var(--border)", cursor: "pointer",
            }}
          >
            Ver más ({listaBase.length - paginaLista} restantes)
          </button>
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
