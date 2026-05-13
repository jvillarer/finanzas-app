"use client";

import { useEffect, useState, useMemo } from "react";
import { obtenerTransacciones, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";

// ─── Paleta (fiel al diseño) ──────────────────────────────────────────────────
const INK       = "#0F2F2F";
const PAPER     = "#FBF9F4";
const CARD      = "#FFFFFF";
const ACCENT    = "#7dd3a8";
const ACCENT_DK = "#3F8C66";
const RUST      = "#C8503E";
const HAIR      = "rgba(15,47,47,0.08)";
const HAIR_DK   = "rgba(15,47,47,0.14)";
const MUTED     = "rgba(15,47,47,0.55)";

const CAT_COLORES = [
  "#E89B2A","#2E78D2","#5B8C7A","#D9534F",
  "#8B5CF6","#E5557A","#16A34A","#F97316",
];
const CAT_ICONOS: Record<string, string> = {
  Comida:"🍽️", Supermercado:"🛒", Transporte:"🚗",
  Entretenimiento:"🎬", Salud:"💊", Servicios:"⚡",
  Ropa:"👕", Hogar:"🏠", Educación:"📚", Otros:"📦",
};

type Periodo = "Mes" | "3M" | "6M" | "Todo";

// ─── Utilidades de fecha ──────────────────────────────────────────────────────
function hoy() { return new Date(); }

function iniciosPeriodo(periodo: Periodo): { desde: Date; hasta: Date; desdePrev: Date; hastaPrev: Date } {
  const ahora = hoy();
  const hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0); // último día del mes actual

  let desde: Date;
  let desdePrev: Date;
  let hastaPrev: Date;

  if (periodo === "Mes") {
    desde     = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    hastaPrev = new Date(desde.getTime() - 1);
    desdePrev = new Date(hastaPrev.getFullYear(), hastaPrev.getMonth(), 1);
  } else if (periodo === "3M") {
    desde     = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1);
    hastaPrev = new Date(desde.getTime() - 1);
    desdePrev = new Date(hastaPrev.getFullYear(), hastaPrev.getMonth() - 2, 1);
  } else if (periodo === "6M") {
    desde     = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);
    hastaPrev = new Date(desde.getTime() - 1);
    desdePrev = new Date(hastaPrev.getFullYear(), hastaPrev.getMonth() - 5, 1);
  } else {
    desde     = new Date(2000, 0, 1);
    desdePrev = new Date(2000, 0, 1);
    hastaPrev = new Date(2000, 0, 1);
  }

  return { desde, hasta, desdePrev, hastaPrev };
}

function fechaStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mesLabel(d: Date) {
  return d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "").replace(/^\w/, c => c.toUpperCase());
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtSig(n: number) {
  return n >= 0 ? `+${fmt(n)}` : `-${fmt(Math.abs(n))}`;
}

// ─── Componente: Gráfica hero (área ingresos vs gastos) ───────────────────────
interface DatoMes { m: string; ingreso: number; gasto: number }

function GraficaHero({ meses }: { meses: DatoMes[] }) {
  const W = 350, H = 130, P = { l: 8, r: 8, t: 14, b: 18 };
  const maxV = Math.max(...meses.flatMap(m => [m.ingreso, m.gasto]), 1) * 1.05;

  const xs  = meses.map((_, i) => P.l + (i / Math.max(meses.length - 1, 1)) * (W - P.l - P.r));
  const yIn = meses.map(m => P.t + (1 - m.ingreso / maxV) * (H - P.t - P.b));
  const yOut= meses.map(m => P.t + (1 - m.gasto   / maxV) * (H - P.t - P.b));

  function curva(xs: number[], ys: number[]) {
    if (xs.length === 1) return `M ${xs[0]} ${ys[0]}`;
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 1; i < xs.length; i++) {
      const xc = (xs[i - 1] + xs[i]) / 2;
      d += ` Q ${xc} ${ys[i-1]} ${xc} ${(ys[i-1]+ys[i])/2}`;
      d += ` Q ${xc} ${ys[i]} ${xs[i]} ${ys[i]}`;
    }
    return d;
  }

  function area(xs: number[], ys: number[]) {
    return curva(xs, ys) + ` L ${xs[xs.length-1]} ${H-P.b} L ${xs[0]} ${H-P.b} Z`;
  }

  if (meses.length === 0) return null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="inGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7dd3a8" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#7dd3a8" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="outGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line key={i} x1={P.l} x2={W - P.r}
          y1={P.t + t*(H-P.t-P.b)} y2={P.t + t*(H-P.t-P.b)}
          stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4"/>
      ))}
      <path d={area(xs, yOut)} fill="url(#outGrad)"/>
      <path d={curva(xs, yOut)} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3"/>
      <path d={area(xs, yIn)} fill="url(#inGrad)"/>
      <path d={curva(xs, yIn)} fill="none" stroke="#7dd3a8" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx={xs[xs.length-1]} cy={yIn[yIn.length-1]} r="4.5" fill="#7dd3a8" stroke="#0F2F2F" strokeWidth="2"/>
      {meses.map((m, i) => (
        <text key={i} x={xs[i]} y={H - 3}
          fontSize="9" fontWeight={i === meses.length - 1 ? "700" : "500"}
          fill={i === meses.length - 1 ? "#7dd3a8" : "rgba(255,255,255,0.5)"}
          textAnchor="middle" fontFamily="Inter, sans-serif">{m.m}</text>
      ))}
    </svg>
  );
}

// ─── Componente: Spark bars ───────────────────────────────────────────────────
function SparkBars({ valores, color, altura = 22 }: { valores: number[]; color: string; altura?: number }) {
  const max = Math.max(...valores, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: `${altura}px` }}>
      {valores.map((v, i) => (
        <div key={i} style={{
          width: "4px",
          height: `${(v / max) * 100}%`,
          background: i === valores.length - 1 ? color : `${color}55`,
          borderRadius: "1px",
          minHeight: "2px",
        }}/>
      ))}
    </div>
  );
}

// ─── Componente: Donut ────────────────────────────────────────────────────────
interface DatoDonut { valor: number; color: string; label: string }

function Donut({ datos, tamaño = 130, trazo = 18 }: { datos: DatoDonut[]; tamaño?: number; trazo?: number }) {
  const total = datos.reduce((s, d) => s + d.valor, 0) || 1;
  const cx = tamaño / 2;
  const r  = cx - trazo / 2 - 2;
  const circ = 2 * Math.PI * r;
  // Gap en grados entre segmentos (solo si hay más de uno)
  const gapGrados = datos.length > 1 ? 1.5 : 0;

  let rotActual = -90; // arriba

  return (
    <div style={{ position: "relative", width: tamaño, height: tamaño, flexShrink: 0 }}>
      <svg width={tamaño} height={tamaño}>
        {/* Pista de fondo */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={HAIR} strokeWidth={trazo}/>
        {datos.map((d, i) => {
          const pct      = d.valor / total;           // 0..1
          const grados   = pct * 360 - gapGrados;     // ángulo del arco menos el hueco
          const dashLen  = (grados / 360) * circ;     // longitud del arco visible
          const rot      = rotActual + gapGrados / 2; // empieza después del hueco
          rotActual += pct * 360;                     // avanzamos el ángulo total
          if (dashLen <= 0) return null;
          return (
            <circle key={i} cx={cx} cy={cx} r={r}
              fill="none" stroke={d.color} strokeWidth={trazo}
              strokeDasharray={`${dashLen} ${circ}`}
              strokeDashoffset={0}
              strokeLinecap="butt"
              transform={`rotate(${rot}, ${cx}, ${cx})`}
            />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "9px", fontWeight: 700, color: MUTED, letterSpacing: "1px", textTransform: "uppercase" }}>Top cat.</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: INK, marginTop: "2px", textAlign: "center", padding: "0 4px" }}>{datos[0]?.label ?? "—"}</span>
        <span style={{ fontSize: "22px", fontWeight: 700, color: datos[0]?.color ?? INK, lineHeight: 1, marginTop: "2px" }}>
          {Math.round((datos[0]?.valor ?? 0) / total * 100)}<span style={{ fontSize: "13px" }}>%</span>
        </span>
      </div>
    </div>
  );
}

// ─── Componente: Heatmap del mes ──────────────────────────────────────────────
function HeatGrid({ dias }: { dias: (number | null)[] }) {
  const GAP = 4, COLS = 7;
  const rows = Math.ceil(dias.length / COLS);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${GAP}px` }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: `${GAP}px`, marginBottom: "4px" }}>
        {["D","L","M","M","J","V","S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "9px", fontWeight: 700, color: MUTED }}>{d}</div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: `${GAP}px` }}>
          {Array.from({ length: COLS }).map((_, c) => {
            const idx = r * COLS + c;
            const v   = dias[idx];
            if (v === null || v === undefined) return <div key={c}/>;
            const bg  = v === 0        ? HAIR
                      : v < 0.25      ? "rgba(125,211,168,0.25)"
                      : v < 0.5       ? "rgba(125,211,168,0.55)"
                      : v < 0.75      ? "rgba(125,211,168,0.85)"
                      :                 RUST + "cc";
            return <div key={c} style={{ aspectRatio: "1", borderRadius: "4px", background: bg }}/>;
          })}
        </div>
      ))}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function EstadisticasPage() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando]           = useState(true);
  const [periodo, setPeriodo]             = useState<Periodo>("Mes");

  useEffect(() => {
    obtenerTransacciones().then(setTransacciones).finally(() => setCargando(false));
    const handler = () => obtenerTransacciones().then(setTransacciones);
    window.addEventListener("lani:transaccion-guardada", handler);
    return () => window.removeEventListener("lani:transaccion-guardada", handler);
  }, []);

  // ── Filtrar por periodo ──────────────────────────────────────────────────────
  const { desde, hasta, desdePrev, hastaPrev } = useMemo(() => iniciosPeriodo(periodo), [periodo]);

  const enPeriodo = useMemo(() =>
    transacciones.filter(t => t.fecha >= fechaStr(desde) && t.fecha <= fechaStr(hasta)),
    [transacciones, desde, hasta]
  );
  const enPrev = useMemo(() =>
    periodo === "Todo" ? [] :
    transacciones.filter(t => t.fecha >= fechaStr(desdePrev) && t.fecha <= fechaStr(hastaPrev)),
    [transacciones, desdePrev, hastaPrev, periodo]
  );

  // ── Métricas principales ─────────────────────────────────────────────────────
  const ingresos = useMemo(() => enPeriodo.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0), [enPeriodo]);
  const gastos   = useMemo(() => enPeriodo.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0),   [enPeriodo]);
  const balance  = ingresos - gastos;

  const ingresosPrev = useMemo(() => enPrev.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0), [enPrev]);
  const gastosPrev   = useMemo(() => enPrev.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0),   [enPrev]);
  const balancePrev  = ingresosPrev - gastosPrev;

  const pctBalance = balancePrev !== 0 ? Math.round(((balance - balancePrev) / Math.abs(balancePrev)) * 100) : 0;
  const difBalance = balance - balancePrev;

  // Tasa de ahorro
  const tasaAhorro = ingresos > 0 ? Math.round(((ingresos - gastos) / ingresos) * 100) : 0;
  const tasaAhorroPrev = ingresosPrev > 0 ? Math.round(((ingresosPrev - gastosPrev) / ingresosPrev) * 100) : 0;
  const difTasa = tasaAhorro - tasaAhorroPrev;

  // Gasto diario promedio
  const diasPeriodo = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / 86400000));
  const gastoDiario = Math.round(gastos / diasPeriodo);
  const diasPrev    = Math.max(1, Math.round((hastaPrev.getTime() - desdePrev.getTime()) / 86400000));
  const gastoDiarioPrev = Math.round(gastosPrev / diasPrev);
  const pctDiario   = gastoDiarioPrev > 0 ? Math.round(((gastoDiario - gastoDiarioPrev) / gastoDiarioPrev) * 100) : 0;

  // ── Datos para la gráfica hero (N meses hacia atrás) ─────────────────────────
  const datosMeses: DatoMes[] = useMemo(() => {
    const mesesCount = periodo === "Mes" ? 6 : periodo === "3M" ? 6 : periodo === "6M" ? 6 : Math.min(12, 6);
    const ahora = hoy();
    return Array.from({ length: mesesCount }, (_, i) => {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - (mesesCount - 1 - i), 1);
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const ini = fechaStr(d);
      const fn  = fechaStr(fin);
      const txs = transacciones.filter(t => t.fecha >= ini && t.fecha <= fn);
      return {
        m:       mesLabel(d),
        ingreso: txs.filter(t => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0),
        gasto:   txs.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0),
      };
    });
  }, [transacciones, periodo]);

  // ── Categorías ───────────────────────────────────────────────────────────────
  const categorias = useMemo(() => {
    const mapa: Record<string, number> = {};
    enPeriodo.filter(t => t.tipo === "gasto").forEach(t => {
      mapa[t.categoria] = (mapa[t.categoria] ?? 0) + Number(t.monto);
    });
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, monto], i) => ({
        nombre,
        monto,
        icono:  CAT_ICONOS[nombre] ?? "📦",
        color:  CAT_COLORES[i % CAT_COLORES.length],
        pct:    gastos > 0 ? Math.round((monto / gastos) * 100) : 0,
      }));
  }, [enPeriodo, gastos]);

  const datosDonut: DatoDonut[] = categorias.map(c => ({ valor: c.monto, color: c.color, label: c.nombre }));

  // ── Heatmap del mes actual ────────────────────────────────────────────────────
  const diasHeatmap: (number | null)[] = useMemo(() => {
    const ahora  = hoy();
    const primerDia = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const diaSemana = primerDia.getDay(); // 0=Dom
    const diasMes   = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();

    // gasto por día del mes actual
    const gastoPorDia: Record<number, number> = {};
    transacciones
      .filter(t => t.tipo === "gasto" && t.fecha.startsWith(`${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`))
      .forEach(t => {
        const d = parseInt(t.fecha.split("-")[2]);
        gastoPorDia[d] = (gastoPorDia[d] ?? 0) + Number(t.monto);
      });

    const maxGasto = Math.max(...Object.values(gastoPorDia), 1);
    const celdas: (number | null)[] = [];

    // Celdas vacías antes del primer día
    for (let i = 0; i < diaSemana; i++) celdas.push(null);

    for (let d = 1; d <= diasMes; d++) {
      const v = gastoPorDia[d];
      celdas.push(v !== undefined ? v / maxGasto : 0);
    }

    // Rellenar hasta múltiplo de 7
    while (celdas.length % 7 !== 0) celdas.push(null);

    return celdas;
  }, [transacciones]);

  // ── Top 5 gastos ─────────────────────────────────────────────────────────────
  const top5 = useMemo(() =>
    enPeriodo
      .filter(t => t.tipo === "gasto")
      .sort((a, b) => Number(b.monto) - Number(a.monto))
      .slice(0, 5),
    [enPeriodo]
  );

  // ── Spark history (últimos 6 valores del periodo) ─────────────────────────────
  const sparkBalance = datosMeses.map(m => Math.max(0, m.ingreso - m.gasto));
  const sparkAhorro  = datosMeses.map(m => m.ingreso > 0 ? Math.round(((m.ingreso - m.gasto) / m.ingreso) * 100) : 0);
  const sparkDiario  = datosMeses.map(m => {
    // aproximamos días del mes
    return m.gasto > 0 ? Math.round(m.gasto / 30) : 0;
  });

  // ── Label del periodo activo ──────────────────────────────────────────────────
  const ahora = hoy();
  const mesActual = ahora.toLocaleDateString("es-MX", { month: "short", year: "numeric" }).replace(".", "").replace(/^\w/, c => c.toUpperCase());

  const PERIODOS: Periodo[] = ["Mes", "3M", "6M", "Todo"];

  if (cargando) {
    return (
      <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: INK }}>
        <div style={{ color: ACCENT, fontSize: 14, fontWeight: 600 }}>Cargando...</div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100dvh", background: PAPER, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif" }}>

      {/* ═══════════ HEADER OSCURO ═══════════ */}
      <div style={{
        flexShrink: 0,
        background: INK,
        color: "#fff",
        paddingTop: "calc(env(safe-area-inset-top) + 16px)",
        paddingLeft: "22px",
        paddingRight: "22px",
        paddingBottom: "16px",
        position: "relative",
      }}>
        {/* Textura sutil */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "16px 16px", pointerEvents: "none",
        }}/>

        {/* Título */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, display: "inline-block" }}/>
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase" }}>
                Análisis · {mesActual}
              </p>
            </div>
            <h1 style={{ fontSize: 34, color: "#fff", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1, marginTop: 4, fontStyle: "italic" }}>
              Tu mes
            </h1>
          </div>
        </div>

        {/* Balance hero */}
        <div style={{ marginTop: 18, position: "relative" }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase" }}>Balance neto</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 50, fontWeight: 800, color: balance >= 0 ? ACCENT : RUST, letterSpacing: "-1.8px", lineHeight: 0.95, fontStyle: "italic" }}>
              {balance >= 0 ? "+" : ""}{fmt(balance)}
            </h2>
            {periodo !== "Todo" && balancePrev !== 0 && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                background: pctBalance >= 0 ? "rgba(125,211,168,0.18)" : "rgba(200,80,62,0.2)",
                color: pctBalance >= 0 ? ACCENT : RUST,
                padding: "4px 8px", borderRadius: 8,
                fontSize: 11, fontWeight: 700,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: pctBalance >= 0 ? "none" : "rotate(180deg)" }}>
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
                {Math.abs(pctBalance)}%
              </div>
            )}
          </div>
          {periodo !== "Todo" && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4, fontWeight: 500 }}>
              <span style={{ color: difBalance >= 0 ? ACCENT : RUST, fontWeight: 700 }}>{fmtSig(difBalance)}</span> vs período anterior
            </p>
          )}
        </div>

        {/* Gráfica */}
        <div style={{ marginTop: 14, marginLeft: -6, marginRight: -6 }}>
          <GraficaHero meses={datosMeses}/>
        </div>

        {/* Selector de periodo */}
        <div style={{
          marginTop: 6,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 12, padding: "3px",
          display: "flex", gap: 2,
        }}>
          {PERIODOS.map(p => (
            <button key={p} onClick={() => setPeriodo(p)} style={{
              flex: 1, height: 32, border: "none", cursor: "pointer", borderRadius: 10,
              background: periodo === p ? ACCENT : "transparent",
              color: periodo === p ? INK : "rgba(255,255,255,0.6)",
              fontSize: 12, fontWeight: 700,
              transition: "all 0.2s",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* ═══════════ CUERPO SCROLLEABLE ═══════════ */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 96 } as React.CSSProperties}>

        {/* KPI CARDS */}
        <div style={{ padding: "18px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            {
              label: "Tasa de ahorro",
              valor: `${tasaAhorro}%`,
              delta: difTasa !== 0 ? `${difTasa > 0 ? "+" : ""}${difTasa}pp` : "—",
              subida: difTasa >= 0,
              spark: sparkAhorro,
              color: ACCENT_DK,
              badge: tasaAhorro >= 20 ? "¡Excelente!" : tasaAhorro >= 10 ? "Bien" : "Mejora",
            },
            {
              label: "Gasto diario",
              valor: fmt(gastoDiario),
              delta: pctDiario !== 0 ? `${pctDiario > 0 ? "+" : ""}${pctDiario}%` : "—",
              subida: pctDiario <= 0,
              spark: sparkDiario,
              color: INK,
              badge: "promedio/día",
            },
          ].map(k => (
            <div key={k.label} style={{
              background: CARD, borderRadius: 18, padding: 14,
              border: `1px solid ${HAIR}`, boxShadow: "0 1px 2px rgba(15,47,47,0.04)",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>{k.label}</p>
                {periodo !== "Todo" && k.delta !== "—" && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 800, padding: "2px 6px", borderRadius: 5,
                    background: k.subida ? "rgba(125,211,168,0.18)" : "rgba(15,47,47,0.06)",
                    color: k.subida ? ACCENT_DK : RUST,
                    display: "flex", alignItems: "center", gap: 2,
                  }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: k.subida ? "none" : "rotate(180deg)" }}>
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                    {k.delta}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 30, fontWeight: 700, color: k.color, letterSpacing: "-1px", lineHeight: 1, fontStyle: "italic" }}>{k.valor}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ fontSize: 10.5, color: MUTED, fontWeight: 600 }}>{k.badge}</span>
                <SparkBars valores={k.spark} color={k.color} altura={22}/>
              </div>
            </div>
          ))}
        </div>

        {/* SECCIÓN: DISTRIBUCIÓN */}
        {categorias.length > 0 && (
          <div style={{ padding: "22px 20px 0" }}>
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase" }}>02 · Distribución</p>
              <h2 style={{ fontSize: 22, color: INK, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 2, fontStyle: "italic" }}>A dónde se va</h2>
            </div>

            <div style={{
              background: CARD, borderRadius: 22, padding: 18,
              border: `1px solid ${HAIR}`, boxShadow: "0 1px 2px rgba(15,47,47,0.04)",
            }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <Donut datos={datosDonut} tamaño={130}/>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {categorias.slice(0, 4).map(c => (
                    <div key={c.nombre} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 3, height: 22, borderRadius: 2, background: c.color, flexShrink: 0 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11.5, color: INK, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nombre}</p>
                        <p style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>{fmt(c.monto)}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.color, fontStyle: "italic" }}>{c.pct}%</span>
                    </div>
                  ))}
                  {categorias.length > 4 && (
                    <div style={{ paddingTop: 4, borderTop: `1px dashed ${HAIR_DK}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>+{categorias.length - 4} categorías</span>
                      <span style={{ fontSize: 10, color: INK, fontWeight: 700 }}>{fmt(categorias.slice(4).reduce((s, c) => s + c.monto, 0))}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SECCIÓN: HEATMAP DEL MES */}
        <div style={{ padding: "22px 20px 0" }}>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase" }}>03 · Patrones</p>
            <h2 style={{ fontSize: 22, color: INK, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 2, fontStyle: "italic" }}>Cuándo gastas</h2>
          </div>
          <div style={{
            background: CARD, borderRadius: 22, padding: 18,
            border: `1px solid ${HAIR}`, boxShadow: "0 1px 2px rgba(15,47,47,0.04)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: INK }}>Mapa del mes</h3>
                <p style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>Cada cuadro = un día · más oscuro = más gasto</p>
              </div>
            </div>
            <HeatGrid dias={diasHeatmap}/>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: MUTED, fontWeight: 600 }}>
              <span>Menos</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[HAIR, "rgba(125,211,168,0.25)", "rgba(125,211,168,0.55)", "rgba(125,211,168,0.85)", RUST+"cc"].map((c, i) => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }}/>
                ))}
              </div>
              <span>Más</span>
            </div>
          </div>
        </div>

        {/* SECCIÓN: TOP 5 GASTOS */}
        {top5.length > 0 && (
          <div style={{ padding: "22px 20px 0" }}>
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase" }}>04 · Highlights</p>
              <h2 style={{ fontSize: 22, color: INK, fontWeight: 700, letterSpacing: "-0.6px", marginTop: 2, fontStyle: "italic" }}>Top {top5.length} gastos</h2>
            </div>
            <div style={{
              background: CARD, borderRadius: 22, padding: "6px 18px",
              border: `1px solid ${HAIR}`, boxShadow: "0 1px 2px rgba(15,47,47,0.04)",
            }}>
              {top5.map((t, idx) => {
                const color = CAT_COLORES[categorias.findIndex(c => c.nombre === t.categoria) % CAT_COLORES.length] || CAT_COLORES[0];
                const icono = CAT_ICONOS[t.categoria] ?? "📦";
                const desc  = t.descripcion || t.categoria;
                return (
                  <div key={t.id} style={{
                    paddingTop: 14, paddingBottom: 14,
                    borderBottom: idx < top5.length - 1 ? `1px solid ${HAIR}` : "none",
                    display: "grid", gridTemplateColumns: "22px 38px 1fr auto", gap: 12, alignItems: "center",
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: MUTED, fontStyle: "italic" }}>0{idx + 1}</span>
                    <div style={{
                      width: 38, height: 38, borderRadius: 11,
                      background: `${color}15`, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>{icono}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: INK, letterSpacing: "-0.1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</p>
                      <p style={{ fontSize: 11, color: MUTED, fontWeight: 500, marginTop: 1 }}>{t.fecha} · {t.categoria}</p>
                    </div>
                    <span style={{ fontSize: 16, color: INK, fontWeight: 700, letterSpacing: "-0.4px", fontStyle: "italic" }}>{fmt(Number(t.monto))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {enPeriodo.length === 0 && (
          <div style={{ padding: "60px 40px", textAlign: "center" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📊</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 6 }}>Sin datos todavía</p>
            <p style={{ fontSize: 14, color: MUTED }}>Agrega transacciones para ver tus estadísticas</p>
          </div>
        )}

      </div>
    </div>
  );
}
