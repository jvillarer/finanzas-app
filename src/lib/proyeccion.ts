import type { Transaccion } from "./supabase";

export interface Proyeccion {
  proyectado: number | null;
  gastoDiarioPromedio: number;
  diasTranscurridos: number;
  diasRestantes: number;
  diasEnMes: number;
  motivo: "ok" | "dia1" | "sin_datos";
}

export function calcularProyeccion(transacciones: Transaccion[]): Proyeccion {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const diaActual = hoy.getDate();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const diasRestantes = diasEnMes - diaActual;
  const inicioMes = new Date(anio, mes, 1);

  if (diaActual === 1) {
    return { proyectado: null, gastoDiarioPromedio: 0, diasTranscurridos: 1, diasRestantes, diasEnMes, motivo: "dia1" };
  }

  const delMes = transacciones.filter((t) => {
    const f = new Date(t.fecha + "T12:00:00");
    return f >= inicioMes && f <= hoy;
  });

  if (delMes.length === 0) {
    return { proyectado: null, gastoDiarioPromedio: 0, diasTranscurridos: diaActual, diasRestantes, diasEnMes, motivo: "sin_datos" };
  }

  const ingresosMes = delMes.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
  const gastosMes   = delMes.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);

  const gastoDiarioPromedio = gastosMes / diaActual;
  const gastosProyectadosRestantes = gastoDiarioPromedio * diasRestantes;
  const proyectado = ingresosMes - (gastosMes + gastosProyectadosRestantes);

  return { proyectado, gastoDiarioPromedio, diasTranscurridos: diaActual, diasRestantes, diasEnMes, motivo: "ok" };
}
