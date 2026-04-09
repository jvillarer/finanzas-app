"use client";

import { useState, useMemo } from "react";
import type { Transaccion } from "@/lib/supabase";
import { formatearMonto } from "@/lib/transacciones";

interface Props {
  transacciones: Transaccion[];
}

// Genera los últimos N meses en formato { clave: "2026-01", etiqueta: "Ene 26" }
function generarMeses(n: number) {
  const meses: { clave: string; etiqueta: string }[] = [];
  const ahora = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const etiqueta = d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
    meses.push({ clave, etiqueta });
  }
  return meses;
}

function mesDeTransaccion(fecha: string) {
  return fecha.slice(0, 7); // "YYYY-MM"
}

export default function EstadoResultados({ transacciones }: Props) {
  const [ingresosAbierto, setIngresosAbierto] = useState(true);
  const [gastosAbierto, setGastosAbierto] = useState(true);
  const [vistaDetalle, setVistaDetalle] = useState(false);

  const meses = useMemo(() => generarMeses(4), []);

  // Agrupar ingresos por categoría
  const ingresosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    transacciones
      .filter((t) => t.tipo === "ingreso")
      .forEach((t) => {
        const cat = t.categoria || "Otros";
        mapa[cat] = (mapa[cat] || 0) + Number(t.monto);
      });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [transacciones]);

  // Agrupar gastos por categoría
  const gastosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    transacciones
      .filter((t) => t.tipo === "gasto")
      .forEach((t) => {
        const cat = t.categoria || "Otros";
        mapa[cat] = (mapa[cat] || 0) + Number(t.monto);
      });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [transacciones]);

  // Totales
  const totalIngresos = ingresosPorCategoria.reduce((s, [, v]) => s + v, 0);
  const totalGastos = gastosPorCategoria.reduce((s, [, v]) => s + v, 0);
  const balance = totalIngresos - totalGastos;

  // --- Vista mensual: monto por categoría por mes ---
  const montoPorCatMes = useMemo(() => {
    const mapa: Record<string, Record<string, number>> = {};
    transacciones.forEach((t) => {
      const cat = t.categoria || "Otros";
      const mes = mesDeTransaccion(t.fecha);
      if (!mapa[cat]) mapa[cat] = {};
      mapa[cat][mes] = (mapa[cat][mes] || 0) + Number(t.monto);
    });
    return mapa;
  }, [transacciones]);

  const totalPorMes = useMemo(() => {
    const ing: Record<string, number> = {};
    const gas: Record<string, number> = {};
    transacciones.forEach((t) => {
      const mes = mesDeTransaccion(t.fecha);
      if (t.tipo === "ingreso") ing[mes] = (ing[mes] || 0) + Number(t.monto);
      else gas[mes] = (gas[mes] || 0) + Number(t.monto);
    });
    return { ing, gas };
  }, [transacciones]);

  // Formateo compacto para la vista mensual
  const fmt = (n: number) =>
    n === 0 ? "—" : new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(n);

  if (transacciones.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Encabezado */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Estado de resultados</h2>
        <button
          onClick={() => setVistaDetalle((v) => !v)}
          className="text-xs text-primary-500 font-medium hover:text-primary-700 transition-colors"
        >
          {vistaDetalle ? "Vista simple" : "Ver por mes →"}
        </button>
      </div>

      {/* ── VISTA SIMPLE ── */}
      {!vistaDetalle && (
        <div className="divide-y divide-gray-50">

          {/* INGRESOS */}
          <div>
            <button
              onClick={() => setIngresosAbierto((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <span className="text-sm font-semibold text-gray-700">Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-600">{formatearMonto(totalIngresos)}</span>
                <span className="text-gray-400 text-xs">{ingresosAbierto ? "▲" : "▼"}</span>
              </div>
            </button>
            {ingresosAbierto && ingresosPorCategoria.map(([cat, monto]) => (
              <div key={cat} className="flex justify-between px-4 py-2 bg-green-50/40">
                <span className="text-xs text-gray-500 pl-6">{cat}</span>
                <span className="text-xs text-green-700 font-medium">{formatearMonto(monto)}</span>
              </div>
            ))}
          </div>

          {/* GASTOS */}
          <div>
            <button
              onClick={() => setGastosAbierto((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">💸</span>
                <span className="text-sm font-semibold text-gray-700">Gastos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-red-500">{formatearMonto(totalGastos)}</span>
                <span className="text-gray-400 text-xs">{gastosAbierto ? "▲" : "▼"}</span>
              </div>
            </button>
            {gastosAbierto && gastosPorCategoria.map(([cat, monto]) => {
              const pct = totalGastos > 0 ? (monto / totalGastos) * 100 : 0;
              return (
                <div key={cat} className="px-4 py-2 bg-red-50/30">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500 pl-6">{cat}</span>
                    <span className="text-xs text-red-600 font-medium">{formatearMonto(monto)}</span>
                  </div>
                  <div className="ml-6 w-full bg-gray-100 rounded-full h-1">
                    <div className="bg-red-400 h-1 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* BALANCE */}
          <div className={`flex items-center justify-between px-4 py-3 ${balance >= 0 ? "bg-primary-50" : "bg-orange-50"}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{balance >= 0 ? "📈" : "📉"}</span>
              <span className="text-sm font-bold text-gray-700">Balance</span>
            </div>
            <span className={`text-base font-bold ${balance >= 0 ? "text-primary-600" : "text-orange-500"}`}>
              {formatearMonto(balance)}
            </span>
          </div>
        </div>
      )}

      {/* ── VISTA MENSUAL ── */}
      {vistaDetalle && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[360px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2 text-gray-500 font-medium w-28">Categoría</th>
                {meses.map((m) => (
                  <th key={m.clave} className="text-right px-2 py-2 text-gray-500 font-medium capitalize">
                    {m.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">

              {/* Fila ingresos total */}
              <tr className="bg-green-50/60 font-semibold">
                <td className="px-4 py-2 text-green-700">💰 Ingresos</td>
                {meses.map((m) => (
                  <td key={m.clave} className="text-right px-2 py-2 text-green-700">
                    {fmt(totalPorMes.ing[m.clave] || 0)}
                  </td>
                ))}
              </tr>
              {ingresosPorCategoria.map(([cat]) => (
                <tr key={cat} className="hover:bg-gray-50">
                  <td className="px-4 py-1.5 text-gray-500 pl-7">{cat}</td>
                  {meses.map((m) => (
                    <td key={m.clave} className="text-right px-2 py-1.5 text-gray-600">
                      {fmt(montoPorCatMes[cat]?.[m.clave] || 0)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Fila gastos total */}
              <tr className="bg-red-50/60 font-semibold">
                <td className="px-4 py-2 text-red-600">💸 Gastos</td>
                {meses.map((m) => (
                  <td key={m.clave} className="text-right px-2 py-2 text-red-600">
                    {fmt(totalPorMes.gas[m.clave] || 0)}
                  </td>
                ))}
              </tr>
              {gastosPorCategoria.map(([cat]) => (
                <tr key={cat} className="hover:bg-gray-50">
                  <td className="px-4 py-1.5 text-gray-500 pl-7">{cat}</td>
                  {meses.map((m) => (
                    <td key={m.clave} className="text-right px-2 py-1.5 text-gray-600">
                      {fmt(montoPorCatMes[cat]?.[m.clave] || 0)}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Balance */}
              <tr className={`font-bold border-t-2 border-gray-200 ${balance >= 0 ? "bg-primary-50" : "bg-orange-50"}`}>
                <td className="px-4 py-2 text-gray-700">📊 Balance</td>
                {meses.map((m) => {
                  const b = (totalPorMes.ing[m.clave] || 0) - (totalPorMes.gas[m.clave] || 0);
                  return (
                    <td key={m.clave} className={`text-right px-2 py-2 ${b >= 0 ? "text-primary-600" : "text-orange-500"}`}>
                      {fmt(b)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
