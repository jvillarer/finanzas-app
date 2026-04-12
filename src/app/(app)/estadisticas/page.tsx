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
    const limite = new Date(); limite.setDate(limite.getDate() - dias);
    return new Date(t.fecha) >= limite;
  });

  const { ingresos, gastos, balance } = calcularResumen(filtradas);

  const porCategoria: Record<string, number> = {};
  filtradas.filter((t) => t.tipo === "gasto").forEach((t) => {
    const cat = t.categoria || "Otros";
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.monto);
  });
  const topCategorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <main className="min-h-screen pb-28" style={{ backgroundColor: "var(--bg)" }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Análisis</p>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>Estadísticas</h1>
      </div>

      <div className="px-5 space-y-4">

        {/* Selector periodo */}
        <div className="flex p-1 rounded-xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          {(["mes", "3meses", "todo"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: periodo === p ? "var(--surface-3)" : "transparent",
                color: periodo === p ? "var(--text-1)" : "var(--text-3)",
                border: periodo === p ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              {p === "mes" ? "Este mes" : p === "3meses" ? "3 meses" : "Todo"}
            </button>
          ))}
        </div>

        {cargando ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3 animate-pulse">🐑</p>
            <p className="text-sm" style={{ color: "var(--text-3)" }}>Calculando...</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Ingresos", valor: formatearMonto(ingresos), color: "var(--success)" },
                { label: "Gastos",   valor: formatearMonto(gastos),   color: "var(--danger)" },
                { label: "Balance",  valor: formatearMonto(balance),  color: balance >= 0 ? "var(--success)" : "var(--danger)" },
              ].map(({ label, valor, color }) => (
                <div
                  key={label}
                  className="rounded-xl p-3 text-center"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>{label}</p>
                  <p className="text-xs font-black font-number" style={{ color }}>{valor}</p>
                </div>
              ))}
            </div>

            {/* Gráfica por categoría */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Gastos por categoría</p>
              <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>Distribución del periodo seleccionado</p>
              <GraficaCategorias transacciones={filtradas} />
            </div>

            {/* Gráfica mensual */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Ingresos vs Gastos</p>
              <p className="text-xs mb-4" style={{ color: "var(--text-3)" }}>Comparativo mensual</p>
              <GraficaMensual transacciones={filtradas} />
            </div>

            {/* Estado de resultados */}
            <EstadoResultados transacciones={filtradas} />

            {/* Top categorías */}
            {topCategorias.length > 0 && (
              <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Donde más gastas</p>
                <p className="text-xs mb-5" style={{ color: "var(--text-3)" }}>Top categorías del periodo</p>
                <ul className="space-y-4">
                  {topCategorias.map(([cat, monto], i) => {
                    const pct = gastos > 0 ? (monto / gastos) * 100 : 0;
                    return (
                      <li key={cat}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>{i + 1}. {cat}</span>
                          <span className="text-xs font-number" style={{ color: "var(--text-3)" }}>
                            {formatearMonto(monto)} · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full rounded-full h-1" style={{ backgroundColor: "var(--surface-3)" }}>
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: "var(--gold)" }}
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
