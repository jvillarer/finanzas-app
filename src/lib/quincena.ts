import type { Transaccion } from "./supabase";

export interface PeriodoQuincena {
  numero: 1 | 2;
  inicio: Date;
  fin: Date;
  label: string;
  diasTranscurridos: number;
  diasRestantes: number;
  diasTotales: number;
}

export function getQuincenaActual(): PeriodoQuincena {
  const hoy = new Date();
  const dia = hoy.getDate();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const mesLabel = hoy.toLocaleString("es-MX", { month: "short" });
  const mesCorto = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  if (dia <= 15) {
    return {
      numero: 1,
      inicio: new Date(anio, mes, 1),
      fin: new Date(anio, mes, 15, 23, 59, 59),
      label: `Q1 · ${mesCorto}`,
      diasTranscurridos: dia,
      diasRestantes: 15 - dia,
      diasTotales: 15,
    };
  } else {
    const ultimoDia = new Date(anio, mes + 1, 0).getDate();
    return {
      numero: 2,
      inicio: new Date(anio, mes, 16),
      fin: new Date(anio, mes + 1, 0, 23, 59, 59),
      label: `Q2 · ${mesCorto}`,
      diasTranscurridos: dia - 15,
      diasRestantes: ultimoDia - dia,
      diasTotales: ultimoDia - 15,
    };
  }
}

export function filtrarPorQuincena(
  transacciones: Transaccion[],
  q: PeriodoQuincena
): Transaccion[] {
  return transacciones.filter((t) => {
    const f = new Date(t.fecha + "T12:00:00");
    return f >= q.inicio && f <= q.fin;
  });
}

export interface ProyeccionQuincena {
  proyectado: number | null;
  gastoDiarioPromedio: number;
  motivo: "ok" | "inicio" | "sin_datos";
}

export function calcularProyeccionQuincena(
  transacciones: Transaccion[],
  q: PeriodoQuincena
): ProyeccionQuincena {
  if (q.diasTranscurridos <= 1) {
    return { proyectado: null, gastoDiarioPromedio: 0, motivo: "inicio" };
  }

  const txsQ = filtrarPorQuincena(transacciones, q);
  if (txsQ.length === 0) {
    return { proyectado: null, gastoDiarioPromedio: 0, motivo: "sin_datos" };
  }

  const ingresos = txsQ
    .filter((t) => t.tipo === "ingreso")
    .reduce((s, t) => s + Number(t.monto), 0);
  const gastos = txsQ
    .filter((t) => t.tipo === "gasto")
    .reduce((s, t) => s + Number(t.monto), 0);

  const gastoDiarioPromedio = gastos / q.diasTranscurridos;
  const proyectado = ingresos - (gastos + gastoDiarioPromedio * q.diasRestantes);

  return { proyectado, gastoDiarioPromedio, motivo: "ok" };
}
