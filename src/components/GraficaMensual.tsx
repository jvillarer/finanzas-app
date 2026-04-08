"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Transaccion } from "@/lib/supabase";

interface Props {
  transacciones: Transaccion[];
}

export default function GraficaMensual({ transacciones }: Props) {
  // Agrupar por mes (últimos 6 meses)
  const porMes: Record<string, { ingresos: number; gastos: number }> = {};

  transacciones.forEach((t) => {
    const fecha = new Date(t.fecha + "T12:00:00");
    const clave = fecha.toLocaleDateString("es-MX", {
      month: "short",
      year: "2-digit",
    });
    if (!porMes[clave]) porMes[clave] = { ingresos: 0, gastos: 0 };
    if (t.tipo === "ingreso") {
      porMes[clave].ingresos += Number(t.monto);
    } else {
      porMes[clave].gastos += Number(t.monto);
    }
  });

  const datos = Object.entries(porMes)
    .slice(-6)
    .map(([mes, vals]) => ({
      mes,
      Ingresos: Math.round(vals.ingresos),
      Gastos: Math.round(vals.gastos),
    }));

  if (datos.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  const formatearK = (valor: number) =>
    valor >= 1000 ? `$${(valor / 1000).toFixed(1)}k` : `$${valor}`;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={datos} barCategoryGap="30%" barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: "#6B7280" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatearK}
          tick={{ fontSize: 10, fill: "#6B7280" }}
          axisLine={false}
          tickLine={false}
          width={45}
        />
        <Tooltip
          formatter={(valor: number) =>
            new Intl.NumberFormat("es-MX", {
              style: "currency",
              currency: "MXN",
            }).format(valor)
          }
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
        <Bar dataKey="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gastos" fill="#534AB7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
