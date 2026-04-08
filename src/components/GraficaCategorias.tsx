"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatearMonto } from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";

const COLORES = [
  "#534AB7", "#7C75D4", "#A8A3E1",
  "#F59E0B", "#EF4444", "#10B981",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
];

interface Props {
  transacciones: Transaccion[];
}

export default function GraficaCategorias({ transacciones }: Props) {
  const gastos = transacciones.filter((t) => t.tipo === "gasto");

  const porCategoria: Record<string, number> = {};
  gastos.forEach((t) => {
    const cat = t.categoria || "Otros";
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.monto);
  });

  const datos = Object.entries(porCategoria)
    .map(([nombre, valor]) => ({ nombre, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  if (datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Sin gastos registrados
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={datos}
          dataKey="valor"
          nameKey="nombre"
          cx="50%"
          cy="45%"
          outerRadius={85}
          innerRadius={45}
          paddingAngle={2}
        >
          {datos.map((_, i) => (
            <Cell key={i} fill={COLORES[i % COLORES.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(valor: number) => [formatearMonto(valor), "Monto"]}
          contentStyle={{
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(valor) => (
            <span style={{ fontSize: "11px", color: "#4B5563" }}>{valor}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
