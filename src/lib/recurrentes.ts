import type { Transaccion } from "./supabase";

export interface PagoRecurrente {
  descripcion: string;
  montoPromedio: number;
  mesesDetectados: number;
  ultimaFecha: string;
}

export function detectarRecurrentes(transacciones: Transaccion[]): PagoRecurrente[] {
  const hoy = new Date();
  const hace6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1); // 6 meses incluyendo el actual

  const gastos = transacciones.filter((t) => {
    if (t.tipo !== "gasto") return false;
    if (!t.descripcion?.trim()) return false;
    const f = new Date(t.fecha + "T12:00:00");
    return f >= hace6Meses;
  });

  // Agrupar por descripción normalizada
  const grupos: Record<string, Transaccion[]> = {};
  for (const t of gastos) {
    const key = t.descripcion.trim().toLowerCase().replace(/\s+/g, " ");
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(t);
  }

  const resultado: PagoRecurrente[] = [];

  for (const txs of Object.values(grupos)) {
    const mesesUnicos = new Set(txs.map((t) => t.fecha.slice(0, 7)));
    if (mesesUnicos.size < 2) continue;

    const montoPromedio = txs.reduce((s, t) => s + Number(t.monto), 0) / txs.length;
    const ordenadas = [...txs].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ultimaFecha = ordenadas[0].fecha;
    const descripcion = ordenadas[0].descripcion.trim();

    resultado.push({ descripcion, montoPromedio, mesesDetectados: mesesUnicos.size, ultimaFecha });
  }

  return resultado.sort((a, b) => b.montoPromedio - a.montoPromedio);
}

export function totalRecurrentes(recurrentes: PagoRecurrente[]): number {
  return recurrentes.reduce((s, r) => s + r.montoPromedio, 0);
}
