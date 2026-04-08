"use client";

import { useState } from "react";
import type { FilaParseada } from "@/lib/parsear-csv";
import { formatearMonto } from "@/lib/transacciones";

interface Props {
  filas: FilaParseada[];
  nombreArchivo: string;
  guardando: boolean;
  onConfirmar: (filasSeleccionadas: FilaParseada[]) => void;
  onCancelar: () => void;
}

export default function VistaPrevia({
  filas,
  nombreArchivo,
  guardando,
  onConfirmar,
  onCancelar,
}: Props) {
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(
    new Set(filas.map((_, i) => i))
  );

  const toggleFila = (i: number) => {
    setSeleccionadas((prev) => {
      const siguiente = new Set(prev);
      siguiente.has(i) ? siguiente.delete(i) : siguiente.add(i);
      return siguiente;
    });
  };

  const toggleTodas = () => {
    if (seleccionadas.size === filas.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(filas.map((_, i) => i)));
    }
  };

  const filasSeleccionadas = filas.filter((_, i) => seleccionadas.has(i));
  const totalIngresos = filasSeleccionadas
    .filter((f) => f.tipo === "ingreso")
    .reduce((s, f) => s + f.monto, 0);
  const totalGastos = filasSeleccionadas
    .filter((f) => f.tipo === "gasto")
    .reduce((s, f) => s + f.monto, 0);

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
      {/* Encabezado */}
      <header className="bg-primary-500 text-white px-4 pt-8 pb-4">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onCancelar} className="text-primary-200 text-sm">
            ← Cancelar
          </button>
          <span className="text-xs text-primary-200 truncate max-w-[150px]">
            {nombreArchivo}
          </span>
        </div>
        <h1 className="text-lg font-bold">Revisar transacciones</h1>
        <p className="text-primary-200 text-xs">
          {seleccionadas.size} de {filas.length} seleccionadas
        </p>
      </header>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-xs text-gray-400">Ingresos</p>
          <p className="text-sm font-bold text-green-600">{formatearMonto(totalIngresos)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <p className="text-xs text-gray-400">Gastos</p>
          <p className="text-sm font-bold text-red-500">{formatearMonto(totalGastos)}</p>
        </div>
      </div>

      {/* Seleccionar todas */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100">
        <input
          type="checkbox"
          checked={seleccionadas.size === filas.length}
          onChange={toggleTodas}
          className="w-4 h-4 accent-primary-500"
          id="seleccionar-todas"
        />
        <label htmlFor="seleccionar-todas" className="text-xs text-gray-500 font-medium">
          Seleccionar todas
        </label>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filas.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">
            No se encontraron transacciones en el archivo
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filas.map((fila, i) => (
              <li
                key={i}
                onClick={() => toggleFila(i)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  seleccionadas.has(i) ? "bg-white" : "bg-gray-50 opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={seleccionadas.has(i)}
                  onChange={() => toggleFila(i)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-primary-500 shrink-0"
                />
                <span className="text-lg shrink-0">
                  {fila.tipo === "ingreso" ? "💰" : "💸"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {fila.descripcion || "Sin descripción"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {fila.fecha} · {fila.categoria}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold shrink-0 ${
                    fila.tipo === "ingreso" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {fila.tipo === "ingreso" ? "+" : "-"}
                  {formatearMonto(fila.monto)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Botón confirmar */}
      <div className="p-4 bg-white border-t border-gray-100">
        <button
          onClick={() => onConfirmar(filasSeleccionadas)}
          disabled={seleccionadas.size === 0 || guardando}
          className="w-full bg-primary-500 text-white font-semibold py-4 rounded-2xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {guardando
            ? "Guardando..."
            : `Importar ${seleccionadas.size} transacciones`}
        </button>
      </div>
    </div>
  );
}
