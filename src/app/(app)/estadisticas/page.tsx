"use client";

import { useEffect, useState } from "react";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";
import GraficaCategorias from "@/components/GraficaCategorias";
import GraficaMensual from "@/components/GraficaMensual";
import EstadoResultados from "@/components/EstadoResultados";

type Periodo = "mes" | "3meses" | "todo";

export default function EstadisticasPage() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("mes");

  useEffect(() => {
    obtenerTransacciones().then(setTransacciones).finally(() => setCargando(false));
  }, []);

  const filtradas = transacciones.filter((t) => {
    if (periodo === "todo") return true;
    const dias = periodo === "mes" ? 30 : 90;
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    return new Date(t.fecha) >= limite;
  });

  const { ingresos, gastos, balance } = calcularResumen(filtradas);

  const porCategoria: Record<string, number> = {};
  filtradas.filter((t) => t.tipo === "gasto").forEach((t) => {
    const cat = t.categoria || "Otros";
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.monto);
  });
  const topCategorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <main className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg)" }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-5">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>Estadísticas</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>Análisis de tus finanzas</p>
      </div>

      <div className="px-4 space-y-4">

        {/* Selector periodo */}
        <div
          className="flex p-1 rounded-2xl bg-white"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          {(["mes", "3meses", "todo"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: periodo === p ? "var(--text-1)" : "transparent",
                color: periodo === p ? "#fff" : "var(--text-3)",
              }}
            >
              {p === "mes" ? "Este mes" : p === "3meses" ? "3 meses" : "Todo"}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3 animate-pulse">🐑</p>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Calculando...</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Ingresos", valor: formatearMonto(ingresos), color: "var(--success)", bg: "#f0fdf4" },
                { label: "Gastos",   valor: formatearMonto(gastos),   color: "var(--danger)",  bg: "#fff1f2" },
                { label: "Balance",  valor: formatearMonto(balance),  color: balance >= 0 ? "var(--success)" : "var(--danger)", bg: "var(--surface)" },
              ].map(({ label, valor, color, bg }) => (
                <div
                  key={label}
                  className="rounded-2xl p-3 text-center"
                  style={{ backgroundColor: bg, boxShadow: "var(--shadow-sm)" }}
                >
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
                  <p className="text-xs font-black font-number" style={{ color }}>{valor}</p>
                </div>
              ))}
            </div>

            {/* Gráfica por categoría */}
            <div className="rounded-3xl p-4 bg-white" style={{ boxShadow: "var(--shadow-md)" }}>
              <p className="text-sm font-black mb-3" style={{ color: "var(--text-1)" }}>Gastos por categoría</p>
              <GraficaCategorias transacciones={filtradas} />
            </div>

            {/* Gráfica mensual */}
            <div className="rounded-3xl p-4 bg-white" style={{ boxShadow: "var(--shadow-md)" }}>
              <p className="text-sm font-black mb-3" style={{ color: "var(--text-1)" }}>Ingresos vs Gastos por mes</p>
              <GraficaMensual transacciones={filtradas} />
            </div>

            {/* Estado de resultados */}
            <EstadoResultados transacciones={filtradas} />

            {/* Top categorías */}
            {topCategorias.length > 0 && (
              <div className="rounded-3xl p-4 bg-white" style={{ boxShadow: "var(--shadow-md)" }}>
                <p className="text-sm font-black mb-4" style={{ color: "var(--text-1)" }}>Donde más gastas</p>
                <ul className="space-y-4">
                  {topCategorias.map(([cat, monto], i) => {
                    const pct = gastos > 0 ? (monto / gastos) * 100 : 0;
                    return (
                      <li key={cat}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold" style={{ color: "var(--text-1)" }}>{i + 1}. {cat}</span>
                          <span className="text-xs font-number" style={{ color: "var(--text-3)" }}>
                            {formatearMonto(monto)} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--surface-2)" }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: "var(--accent)" }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
