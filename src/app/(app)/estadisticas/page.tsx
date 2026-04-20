"use client";

import { useEffect, useState, useMemo } from "react";
import { obtenerTransacciones, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════
type Periodo = "mes" | "3m" | "6m" | "todo";

const CAT_ICON: Record<string, string> = {
  Comida: "🍽", Supermercado: "🛒", Transporte: "🚗",
  Entretenimiento: "🎬", Salud: "💊", Servicios: "⚡",
  Ropa: "👕", Hogar: "🏠", Educación: "📚", Otros: "📦",
};

const COLORES = [
  "#f59e0b", "#3b82f6", "#10b981", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

// ═══════════════════════════════════════════════════════════
// GRÁFICA: BARRAS MENSUALES (ingresos vs gastos, N meses)
// ═══════════════════════════════════════════════════════════
interface DatoMes {
  label: string;
  ingresos: number;
  gastos: number;
  esActual: boolean;
}

function BarrasMensuales({ datos }: { datos: DatoMes[] }) {
  const maxVal = Math.max(...datos.map((m) => Math.max(m.ingresos, m.gastos)), 1);
  const ALTO = 90;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: ALTO + 22 }}>
        {datos.map((mes, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: ALTO }}>
              <div style={{
                flex: 1, borderRadius: "4px 4px 0 0",
                backgroundColor: "var(--success)",
                height: mes.ingresos > 0 ? `${(mes.ingresos / maxVal) * ALTO}px` : "2px",
                minHeight: 2,
                opacity: mes.esActual ? 1 : 0.35,
                transition: "height 1.1s cubic-bezier(0.22,1,0.36,1)",
              }} />
              <div style={{
                flex: 1, borderRadius: "4px 4px 0 0",
                backgroundColor: "var(--danger)",
                height: mes.gastos > 0 ? `${(mes.gastos / maxVal) * ALTO}px` : "2px",
                minHeight: 2,
                opacity: mes.esActual ? 1 : 0.35,
                transition: "height 1.1s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
            <p style={{
              fontSize: 9, lineHeight: 1, textTransform: "capitalize",
              fontWeight: mes.esActual ? 700 : 400,
              color: mes.esActual ? "var(--gold)" : "var(--text-3)",
            }}>
              {mes.label}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "var(--success)" }} />
          <p style={{ fontSize: 11, color: "var(--text-3)" }}>Ingresos</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "var(--danger)" }} />
          <p style={{ fontSize: 11, color: "var(--text-3)" }}>Gastos</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GRÁFICA: DONUT DE CATEGORÍAS
// ═══════════════════════════════════════════════════════════
function DonutCategorias({ datos, total }: { datos: [string, number][]; total: number }) {
  const R = 48;
  const GROSOR = 16;
  const circunferencia = 2 * Math.PI * R;

  let acumulado = 0;
  const arcos = datos.slice(0, 6).map(([cat, monto], i) => {
    const pct = monto / total;
    const largo = circunferencia * pct;
    const dashOffset = circunferencia - acumulado;
    acumulado += largo;
    return { cat, monto, pct, largo, dashOffset, color: COLORES[i] };
  });

  // Índice del arco más grande (para etiqueta central)
  const mayor = arcos.reduce((prev, cur) => (cur.pct > prev.pct ? cur : prev), arcos[0]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      {/* Donut SVG */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={120} height={120} viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={60} cy={60} r={R} fill="none" stroke="var(--surface-3)" strokeWidth={GROSOR} />
          {arcos.map((arco, i) => (
            <circle
              key={i}
              cx={60} cy={60} r={R}
              fill="none"
              stroke={arco.color}
              strokeWidth={GROSOR}
              strokeDasharray={`${arco.largo - 1.5} ${circunferencia - arco.largo + 1.5}`}
              strokeDashoffset={arco.dashOffset}
            />
          ))}
        </svg>
        {/* Etiqueta central */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <p style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600 }}>top</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: mayor?.color, textAlign: "center", lineHeight: 1.2, maxWidth: 52 }}>
            {mayor?.cat}
          </p>
          <p className="font-number" style={{ fontSize: 13, fontWeight: 900, color: mayor?.color }}>
            {(mayor?.pct * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
        {arcos.map((arco) => (
          <div key={arco.cat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: arco.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {CAT_ICON[arco.cat] || "📦"} {arco.cat}
            </span>
            <span className="font-number" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", flexShrink: 0 }}>
              {fmt(arco.monto)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GRÁFICA: SPARKLINE DIARIA DEL MES
// ═══════════════════════════════════════════════════════════
function SparklineDiaria({ txs }: { txs: Transaccion[] }) {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const diaActual = hoy.getDate();

  const porDia = Array.from({ length: diaActual }, (_, i) => {
    const dia = String(i + 1).padStart(2, "0");
    const mesStr = String(mes + 1).padStart(2, "0");
    const fecha = `${anio}-${mesStr}-${dia}`;
    return txs.filter((t) => t.fecha === fecha && t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
  });

  const maxVal = Math.max(...porDia, 1);
  const W = 320;
  const H = 70;
  const paso = porDia.length > 1 ? W / (porDia.length - 1) : W;

  const puntos = porDia.map((val, i) => ({
    x: i * paso,
    y: H - (val / maxVal) * (H - 8),
  }));

  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = linea + ` L ${puntos[puntos.length - 1].x.toFixed(1)} ${H} L 0 ${H} Z`;

  const maxIdx = porDia.indexOf(Math.max(...porDia));
  const promDiario = porDia.reduce((s, v) => s + v, 0) / Math.max(porDia.length, 1);

  return (
    <div>
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: 80, display: "block" }}
        >
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
            </linearGradient>
          </defs>
          {porDia.length > 1 && <path d={area} fill="url(#sparkGrad)" />}
          {porDia.length > 1 && (
            <path d={linea} fill="none" stroke="var(--danger)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {/* Punto del día pico */}
          {maxIdx >= 0 && puntos[maxIdx] && (
            <circle cx={puntos[maxIdx].x} cy={puntos[maxIdx].y} r={4} fill="var(--danger)" />
          )}
          {/* Línea de promedio */}
          {(() => {
            const promedioY = H - (promDiario / maxVal) * (H - 8);
            return (
              <line
                x1={0} y1={promedioY} x2={W} y2={promedioY}
                stroke="var(--gold)" strokeWidth={1} strokeDasharray="4 4" opacity={0.7}
              />
            );
          })()}
        </svg>
      </div>

      {/* Eje X: semanas */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {[1, 8, 15, 22, diasMes].map((d) => (
          <p key={d} style={{ fontSize: 9, color: "var(--text-3)" }}>
            {d <= diaActual ? `día ${d}` : ""}
          </p>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 3, borderRadius: 99, backgroundColor: "var(--danger)" }} />
          <p style={{ fontSize: 10, color: "var(--text-3)" }}>Gasto diario</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 10, height: 2, borderRadius: 99, backgroundColor: "var(--gold)", opacity: 0.7 }} style={{ borderTop: "2px dashed var(--gold)", width: 10, opacity: 0.7 }} />
          <p style={{ fontSize: 10, color: "var(--text-3)" }}>Promedio {fmt(promDiario)}/día</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GRÁFICA: HEATMAP POR DÍA DE LA SEMANA
// ═══════════════════════════════════════════════════════════
function HeatmapSemana({ txs }: { txs: Transaccion[] }) {
  const porDia = Array(7).fill(0) as number[];
  const cuentaDia = Array(7).fill(0) as number[];

  for (const t of txs) {
    if (t.tipo !== "gasto") continue;
    const d = new Date(t.fecha + "T12:00:00").getDay();
    porDia[d] += Number(t.monto);
    cuentaDia[d]++;
  }

  const promPorDia = porDia.map((total, i) => (cuentaDia[i] > 0 ? total / cuentaDia[i] : 0));
  const maxProm = Math.max(...promPorDia, 1);

  return (
    <div style={{ display: "flex", gap: 5, alignItems: "flex-end" }}>
      {DIAS_SEMANA.map((dia, i) => {
        const pct = promPorDia[i] / maxProm;
        const esPico = pct > 0.85;
        return (
          <div key={dia} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <p className="font-number" style={{ fontSize: 9, color: esPico ? "var(--danger)" : "var(--text-3)", fontWeight: esPico ? 700 : 400 }}>
              {promPorDia[i] > 0 ? fmt(promPorDia[i]) : ""}
            </p>
            <div style={{
              width: "100%", borderRadius: 4,
              height: `${Math.max(pct * 72, 4)}px`,
              backgroundColor: esPico ? "var(--danger)" : pct > 0.5 ? "#f59e0b" : "var(--surface-3)",
              transition: "height 0.9s cubic-bezier(0.22,1,0.36,1)",
            }} />
            <p style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 500 }}>{dia}</p>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════
export default function EstadisticasPage() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  useEffect(() => {
    obtenerTransacciones().then(setTransacciones).finally(() => setCargando(false));
  }, []);

  const hoy = new Date();

  // ── Filtro de periodo ──────────────────────────────────
  const filtradas = useMemo(() => {
    const inicio = {
      mes: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
      "3m": new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1),
      "6m": new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1),
      todo: new Date(0),
    }[periodo];
    return transacciones.filter((t) => new Date(t.fecha + "T12:00:00") >= inicio);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transacciones, periodo]);

  const ingresos = useMemo(() => filtradas.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0), [filtradas]);
  const gastos = useMemo(() => filtradas.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0), [filtradas]);
  const balance = ingresos - gastos;
  const tasaAhorro = ingresos > 0 ? ((ingresos - gastos) / ingresos) * 100 : null;

  // ── Gasto diario promedio ──────────────────────────────
  const promedioDiario = useMemo(() => {
    const diasTranscurridos = periodo === "mes"
      ? hoy.getDate()
      : periodo === "3m"
      ? Math.ceil((hoy.getTime() - new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1).getTime()) / 86400000)
      : periodo === "6m"
      ? Math.ceil((hoy.getTime() - new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1).getTime()) / 86400000)
      : filtradas.length > 0
      ? Math.max(1, Math.ceil((hoy.getTime() - new Date(filtradas[filtradas.length - 1].fecha + "T12:00:00").getTime()) / 86400000))
      : 30;
    return diasTranscurridos > 0 ? gastos / diasTranscurridos : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtradas, gastos, periodo]);

  // ── Comparativa vs mes anterior ───────────────────────
  const deltaGasto = useMemo(() => {
    if (periodo !== "mes") return null;
    const inicioAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    const gastosAnt = transacciones
      .filter((t) => {
        const f = new Date(t.fecha + "T12:00:00");
        return t.tipo === "gasto" && f >= inicioAnt && f <= finAnt;
      })
      .reduce((s, t) => s + Number(t.monto), 0);
    return gastosAnt > 0 ? ((gastos - gastosAnt) / gastosAnt) * 100 : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transacciones, gastos, periodo]);

  // ── Categorías ────────────────────────────────────────
  const categorias = useMemo(() => {
    const porCat: Record<string, number> = {};
    filtradas.filter((t) => t.tipo === "gasto").forEach((t) => {
      const cat = t.categoria || "Otros";
      porCat[cat] = (porCat[cat] || 0) + Number(t.monto);
    });
    return Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  }, [filtradas]);

  // ── Datos barras mensuales (últimos 6 meses) ──────────
  const datosMensuales = useMemo((): DatoMes[] => {
    return Array.from({ length: 6 }, (_, i) => {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1);
      const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
      const txsMes = transacciones.filter((t) => {
        const f = new Date(t.fecha + "T12:00:00");
        return f >= fecha && f <= fin;
      });
      return {
        label: fecha.toLocaleString("es-MX", { month: "short" }),
        ingresos: txsMes.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0),
        gastos: txsMes.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0),
        esActual: i === 5,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transacciones]);

  // ── Mes con mayor gasto ────────────────────────────────
  const peorMes = useMemo(() => {
    return datosMensuales.reduce((prev, cur) => cur.gastos > prev.gastos ? cur : prev, datosMensuales[0]);
  }, [datosMensuales]);

  // ── Transacciones top 5 más grandes ───────────────────
  const topTransacciones = useMemo(() =>
    [...filtradas]
      .filter((t) => t.tipo === "gasto")
      .sort((a, b) => Number(b.monto) - Number(a.monto))
      .slice(0, 5),
    [filtradas]
  );

  // ── Periodo label para el selector ───────────────────
  const periodoOpciones: { key: Periodo; label: string }[] = [
    { key: "mes", label: hoy.toLocaleString("es-MX", { month: "short" }).replace(/^\w/, (c) => c.toUpperCase()) },
    { key: "3m", label: "3 meses" },
    { key: "6m", label: "6 meses" },
    { key: "todo", label: "Todo" },
  ];

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)", paddingBottom: 120 }}>

      {/* ── HEADER ── */}
      <div style={{ padding: "56px 20px 16px" }}>
        <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
          Análisis
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.03em" }}>
          Dashboard
        </h1>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── SELECTOR PERIODO ── */}
        <div style={{
          display: "flex", padding: 4, borderRadius: 14,
          backgroundColor: "var(--surface)", border: "1px solid var(--border)",
        }}>
          {periodoOpciones.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriodo(key)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 10,
                fontSize: 12, fontWeight: 600,
                backgroundColor: periodo === key ? "var(--surface-3)" : "transparent",
                color: periodo === key ? "var(--text-1)" : "var(--text-3)",
                border: periodo === key ? "1px solid var(--border)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {cargando ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }} className="animate-pulse">🐑</p>
            <p style={{ fontSize: 13, color: "var(--text-3)" }}>Calculando...</p>
          </div>
        ) : (
          <>
            {/* ── BALANCE HERO ── */}
            <div style={{
              padding: "20px", borderRadius: 20,
              background: `linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)`,
              border: `1px solid ${balance >= 0 ? "var(--success)" : "var(--danger)"}44`,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>
                Balance del periodo
              </p>
              <p className="font-display" style={{
                fontSize: 42, fontWeight: 400, fontStyle: "italic",
                letterSpacing: "-0.03em", lineHeight: 1,
                color: balance >= 0 ? "var(--success)" : "var(--danger)",
              }}>
                {formatearMonto(balance)}
              </p>
              <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                <div>
                  <p className="font-number" style={{ fontSize: 14, fontWeight: 700, color: "var(--success)" }}>
                    +{formatearMonto(ingresos)}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>Ingresos</p>
                </div>
                <div style={{ width: 1, backgroundColor: "var(--border-2)", alignSelf: "stretch" }} />
                <div>
                  <p className="font-number" style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>
                    −{formatearMonto(gastos)}
                  </p>
                  <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>Gastos</p>
                </div>
                {ingresos > 0 && (
                  <>
                    <div style={{ width: 1, backgroundColor: "var(--border-2)", alignSelf: "stretch" }} />
                    <div>
                      <p className="font-number" style={{
                        fontSize: 14, fontWeight: 700,
                        color: (tasaAhorro ?? 0) >= 20 ? "var(--success)" : (tasaAhorro ?? 0) >= 0 ? "var(--gold)" : "var(--danger)",
                      }}>
                        {(tasaAhorro ?? 0).toFixed(0)}%
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>Ahorro</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── KPIs 2x2 ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {/* Gasto diario */}
              <div style={{ padding: "16px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
                  Gasto diario
                </p>
                <p className="font-number" style={{ fontSize: 22, fontWeight: 900, color: "var(--text-1)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {fmt(promedioDiario)}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
                  promedio del periodo
                </p>
              </div>

              {/* Delta vs mes anterior */}
              <div style={{ padding: "16px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
                  vs mes anterior
                </p>
                {deltaGasto !== null ? (
                  <>
                    <p className="font-number" style={{
                      fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1,
                      color: deltaGasto <= 0 ? "var(--success)" : "var(--danger)",
                    }}>
                      {deltaGasto > 0 ? "+" : ""}{deltaGasto.toFixed(0)}%
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
                      {deltaGasto <= 0 ? "gastaste menos" : "gastaste más"}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
                    {periodo === "mes" ? "Sin dato previo" : "Solo en vista mensual"}
                  </p>
                )}
              </div>

              {/* Tasa de ahorro */}
              <div style={{ padding: "16px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
                  Tasa de ahorro
                </p>
                {tasaAhorro !== null ? (
                  <>
                    <p className="font-number" style={{
                      fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1,
                      color: tasaAhorro >= 20 ? "var(--success)" : tasaAhorro >= 0 ? "var(--gold)" : "var(--danger)",
                    }}>
                      {tasaAhorro.toFixed(0)}%
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>
                      {tasaAhorro >= 20 ? "¡Excelente!" : tasaAhorro >= 10 ? "Bien" : tasaAhorro >= 0 ? "Justo" : "En negativo"}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Sin ingresos</p>
                )}
              </div>

              {/* Mes con más gasto */}
              <div style={{ padding: "16px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
                  Mes más caro
                </p>
                <p className="font-number" style={{ fontSize: 22, fontWeight: 900, color: "var(--danger)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {fmt(peorMes?.gastos ?? 0)}
                </p>
                <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6, textTransform: "capitalize" }}>
                  {peorMes?.label ?? "—"}
                </p>
              </div>
            </div>

            {/* ── INGRESOS VS GASTOS (6 meses) ── */}
            <div style={{
              padding: "18px", borderRadius: 20,
              backgroundColor: "var(--surface)", border: "1px solid var(--border)",
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>Ingresos vs Gastos</p>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 18 }}>Comparativo de los últimos 6 meses</p>
              <BarrasMensuales datos={datosMensuales} />
            </div>

            {/* ── DISTRIBUCIÓN DE CATEGORÍAS ── */}
            {categorias.length > 0 && gastos > 0 && (
              <div style={{
                padding: "18px", borderRadius: 20,
                backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>Distribución de gastos</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 18 }}>Por categoría en el periodo</p>
                <DonutCategorias datos={categorias} total={gastos} />

                {/* Barras detalle */}
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border-2)", paddingTop: 16 }}>
                  {categorias.slice(0, 7).map(([cat, monto], i) => {
                    const pct = (monto / gastos) * 100;
                    return (
                      <div key={cat}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
                            {CAT_ICON[cat] || "📦"} {cat}
                          </span>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span className="font-number" style={{ fontSize: 11, color: "var(--text-3)" }}>
                              {formatearMonto(monto)}
                            </span>
                            <span className="font-number" style={{ fontSize: 11, fontWeight: 700, color: COLORES[i], minWidth: 28, textAlign: "right" }}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div style={{ width: "100%", height: 5, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
                          <div style={{
                            height: 5, borderRadius: 99, backgroundColor: COLORES[i],
                            width: `${pct}%`, transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── EVOLUCIÓN DIARIA (solo en vista mensual) ── */}
            {periodo === "mes" && (
              <div style={{
                padding: "18px", borderRadius: 20,
                backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>Evolución diaria</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                  Gasto por día — {hoy.toLocaleString("es-MX", { month: "long", year: "numeric" })}
                </p>
                <SparklineDiaria txs={filtradas} />
              </div>
            )}

            {/* ── HEATMAP DÍAS DE SEMANA ── */}
            {filtradas.length > 0 && (
              <div style={{
                padding: "18px", borderRadius: 20,
                backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>¿Cuándo gastas más?</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 18 }}>Gasto promedio por día de la semana</p>
                <HeatmapSemana txs={filtradas} />
              </div>
            )}

            {/* ── ESTADO DE RESULTADOS ── */}
            {(ingresos > 0 || gastos > 0) && (
              <div style={{
                padding: "18px", borderRadius: 20,
                backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 16 }}>Estado de resultados</p>

                {/* Ingresos */}
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--success)", marginBottom: 8 }}>
                    Ingresos
                  </p>
                  {(() => {
                    const porFuente: Record<string, number> = {};
                    filtradas.filter((t) => t.tipo === "ingreso").forEach((t) => {
                      const fuente = t.categoria || t.descripcion || "Otros";
                      porFuente[fuente] = (porFuente[fuente] || 0) + Number(t.monto);
                    });
                    return Object.entries(porFuente).sort((a, b) => b[1] - a[1]).map(([fuente, monto]) => (
                      <div key={fuente} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border-2)" }}>
                        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{fuente}</span>
                        <span className="font-number" style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>
                          +{formatearMonto(monto)}
                        </span>
                      </div>
                    ));
                  })()}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 4px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>Total ingresos</span>
                    <span className="font-number" style={{ fontSize: 13, fontWeight: 900, color: "var(--success)" }}>+{formatearMonto(ingresos)}</span>
                  </div>
                </div>

                {/* Gastos */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--danger)", marginBottom: 8 }}>
                    Gastos
                  </p>
                  {categorias.map(([cat, monto]) => (
                    <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border-2)" }}>
                      <span style={{ fontSize: 12, color: "var(--text-2)" }}>{CAT_ICON[cat] || "📦"} {cat}</span>
                      <span className="font-number" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>
                        −{formatearMonto(monto)}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0 4px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>Total gastos</span>
                    <span className="font-number" style={{ fontSize: 13, fontWeight: 900, color: "var(--danger)" }}>−{formatearMonto(gastos)}</span>
                  </div>
                </div>

                {/* Balance final */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px", borderRadius: 12,
                  backgroundColor: balance >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${balance >= 0 ? "var(--success)" : "var(--danger)"}44`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-1)" }}>Balance</span>
                  <span className="font-number" style={{
                    fontSize: 16, fontWeight: 900,
                    color: balance >= 0 ? "var(--success)" : "var(--danger)",
                  }}>
                    {balance >= 0 ? "+" : ""}{formatearMonto(balance)}
                  </span>
                </div>
              </div>
            )}

            {/* ── TOP TRANSACCIONES ── */}
            {topTransacciones.length > 0 && (
              <div style={{
                padding: "18px", borderRadius: 20,
                backgroundColor: "var(--surface)", border: "1px solid var(--border)",
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>Gastos más grandes</p>
                <p style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>Top 5 transacciones del periodo</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {topTransacciones.map((t, i) => (
                    <div key={t.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "11px 0",
                      borderBottom: i < topTransacciones.length - 1 ? "1px solid var(--border-2)" : "none",
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        backgroundColor: "var(--surface-2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15, flexShrink: 0,
                      }}>
                        {CAT_ICON[t.categoria] || "📦"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.descripcion || t.categoria || "Sin descripción"}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                          {new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                          {t.categoria ? ` · ${t.categoria}` : ""}
                        </p>
                      </div>
                      <p className="font-number" style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", flexShrink: 0 }}>
                        {formatearMonto(Number(t.monto))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estado vacío */}
            {filtradas.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>📊</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Sin datos en este periodo</p>
                <p style={{ fontSize: 12, color: "var(--text-3)" }}>Registra tus gastos para ver el análisis</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
