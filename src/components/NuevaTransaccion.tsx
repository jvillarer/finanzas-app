"use client";

import { useState } from "react";
import { crearTransaccion } from "@/lib/transacciones";

const CATEGORIAS = [
  "Alimentación",
  "Transporte",
  "Vivienda",
  "Salud",
  "Entretenimiento",
  "Ropa",
  "Educación",
  "Salario",
  "Negocio",
  "Otros",
];

interface Props {
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function NuevaTransaccion({ onCerrar, onGuardado }: Props) {
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0) {
      setError("Ingresa un monto válido");
      return;
    }
    if (!fecha) {
      setError("Selecciona una fecha");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await crearTransaccion({
        monto: Number(monto),
        descripcion,
        categoria,
        tipo,
        fecha,
      });
      onGuardado();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="bg-white w-full rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">Nueva transacción</h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tipo */}
        <div className="flex gap-2 mb-5">
          {(["gasto", "ingreso"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize ${
                tipo === t
                  ? t === "ingreso"
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {t === "ingreso" ? "💰 Ingreso" : "💸 Gasto"}
            </button>
          ))}
        </div>

        {/* Monto */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Monto</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* Descripción */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">
            Descripción (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej. Súper, gasolina..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {/* Categoría */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-300"
          >
            <option value="">Seleccionar...</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha */}
        <div className="mb-5">
          <label className="text-xs text-gray-500 mb-1 block">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        {error && (
          <p className="text-red-500 text-xs mb-3">{error}</p>
        )}

        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full bg-primary-500 text-white font-semibold py-4 rounded-2xl hover:bg-primary-600 disabled:opacity-50 transition-colors"
        >
          {guardando ? "Guardando..." : "Guardar transacción"}
        </button>
      </div>
    </div>
  );
}
