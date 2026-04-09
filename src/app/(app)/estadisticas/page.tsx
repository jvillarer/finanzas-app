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
    obtenerTransacciones()
      .then(setTransacciones)
      .finally(() => setCargando(false));
  }, []);

  const filtradas = transacciones.filter((t) => {
    if (periodo === "todo") return true;
    const dias = periodo === "mes" ? 30 : 90;
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    return new Date(t.fecha) >= limite;
  });

  const { ingresos, gastos, balance } = calcularResumen(filtradas);

  // Top 3 categorías de gasto
  const porCategoria: Record<string, number> = {};
  filtradas
    .filter((t) => t.tipo === "gasto")
    .forEach((t) => {
      const cat = t.categoria || "Otros";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.monto);
    });
  const topCategorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <main className="bg-gray-50 min-h-screen pb-6">
      {/* Encabezado */}
      <header className="bg-primary-500 text-white px-6 pt-8 pb-10">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <p className="text-primary-200 text-xs mt-0.5">Análisis de tus finanzas</p>
      </header>

      <div className="px-4 -mt-6 space-y-4">
        {/* Selector de período */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1 flex">
          {(["mes", "3meses", "todo"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                periodo === p
                  ? "bg-primary-500 text-white"
                  : "text-gray-500 hover:text-primary-500"
              }`}
            >
              {p === "mes" ? "Este mes" : p === "3meses" ? "3 meses" : "Todo"}
            </button>
          ))}
        </div>

        {cargando ? (
          <p className="text-center text-gray-400 text-sm py-10">Cargando...</p>
        ) : (
          <>
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">Ingresos</p>
                <p className="text-sm font-bold text-green-600 leading-tight">
                  {formatearMonto(ingresos)}
                </p>
              </div>
              <div className="bg-red-50 rounded-2xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-0.5">Gastos</p>
                <p className="text-sm font-bold text-red-500 leading-tight">
                  {formatearMonto(gastos)}
                </p>
              </div>
              <div
                className={`rounded-2xl p-3 text-center ${
                  balance >= 0 ? "bg-primary-50" : "bg-orange-50"
                }`}
              >
                <p className="text-xs text-gray-400 mb-0.5">Balance</p>
                <p
                  className={`text-sm font-bold leading-tight ${
                    balance >= 0 ? "text-primary-600" : "text-orange-500"
                  }`}
                >
                  {formatearMonto(balance)}
                </p>
              </div>
            </div>

            {/* Gráfica por categoría */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Gastos por categoría
              </h2>
              <GraficaCategorias transacciones={filtradas} />
            </div>

            {/* Gráfica mensual */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Ingresos vs Gastos por mes
              </h2>
              <GraficaMensual transacciones={filtradas} />
            </div>

            {/* Estado de resultados */}
            <EstadoResultados transacciones={filtradas} />

            {/* Top categorías */}
            {topCategorias.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Donde más gastas
                </h2>
                <ul className="space-y-2">
                  {topCategorias.map(([cat, monto], i) => {
                    const porcentaje = gastos > 0 ? (monto / gastos) * 100 : 0;
                    return (
                      <li key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 font-medium">
                            {i + 1}. {cat}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatearMonto(monto)} · {porcentaje.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${porcentaje}%` }}
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
