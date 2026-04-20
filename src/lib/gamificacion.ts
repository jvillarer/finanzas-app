import type { Transaccion } from "./supabase";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export type Logro = {
  id: string;
  titulo: string;
  descripcion: string;
  emoji: string;
  xp: number;
};

export type Nivel = {
  min: number;
  label: string;
  emoji: string;
};

export type NivelActual = Nivel & {
  xpActual: number;
  xpSiguiente: number;
  progreso: number; // 0-100
};

export type Racha = {
  dias: number;
  activa: boolean;
  enRiesgo: boolean;
};

export type PerfilGasto = {
  emoji: string;
  label: string;
  categoria: string;
};

export type MejorMes = {
  monto: number;
  mes: string;
};

export type Reto = {
  emoji: string;
  titulo: string;
  descripcion: string;
  progreso: number;
  meta: number;
  unidad: string;
};

// ─────────────────────────────────────────────
// Catálogo de logros
// ─────────────────────────────────────────────

export const CATALOGO_LOGROS: Logro[] = [
  {
    id: "primer_registro",
    titulo: "Primeros pasos",
    descripcion: "Registraste tu primera transacción",
    emoji: "📝",
    xp: 50,
  },
  {
    id: "primer_ingreso",
    titulo: "Primer ingreso",
    descripcion: "Registraste tu primer ingreso",
    emoji: "💰",
    xp: 50,
  },
  {
    id: "racha_7",
    titulo: "En llamas",
    descripcion: "7 días seguidos registrando",
    emoji: "🔥",
    xp: 100,
  },
  {
    id: "racha_14",
    titulo: "Imparable",
    descripcion: "14 días seguidos registrando",
    emoji: "🔥🔥",
    xp: 200,
  },
  {
    id: "racha_30",
    titulo: "Racha legendaria",
    descripcion: "30 días seguidos registrando",
    emoji: "💎",
    xp: 500,
  },
  {
    id: "registros_50",
    titulo: "50 movimientos",
    descripcion: "Registraste 50 transacciones en total",
    emoji: "🧾",
    xp: 100,
  },
  {
    id: "registros_100",
    titulo: "100 movimientos",
    descripcion: "Registraste 100 transacciones en total",
    emoji: "🏅",
    xp: 200,
  },
  {
    id: "ahorro_10",
    titulo: "Ahorrador",
    descripcion: "Tuviste un mes con más de 10% de ahorro",
    emoji: "💪",
    xp: 150,
  },
  {
    id: "ahorro_20",
    titulo: "Ahorrador Pro",
    descripcion: "Tuviste un mes con más de 20% de ahorro",
    emoji: "🦁",
    xp: 300,
  },
  {
    id: "score_80",
    titulo: "Score estelar",
    descripcion: "Alcanzaste un score financiero de 80% o más",
    emoji: "⭐",
    xp: 200,
  },
  {
    id: "viajero",
    titulo: "Viajero",
    descripcion: "Registraste un gasto asociado a un viaje",
    emoji: "✈️",
    xp: 75,
  },
  {
    id: "meta_cumplida",
    titulo: "Meta cumplida",
    descripcion: "Completaste una meta de ahorro",
    emoji: "🎯",
    xp: 250,
  },
];

// ─────────────────────────────────────────────
// Niveles
// ─────────────────────────────────────────────

export const NIVELES: Nivel[] = [
  { min: 0, label: "Borrego Novato", emoji: "🐑" },
  { min: 200, label: "Borrego Aplicado", emoji: "📚" },
  { min: 500, label: "Borrego Inteligente", emoji: "🧠" },
  { min: 1000, label: "Lobo con piel de borrego", emoji: "🐺" },
  { min: 2000, label: "Lobo de Wall Street", emoji: "💼" },
  { min: 5000, label: "Gordon Borrego", emoji: "🏦" },
];

// ─────────────────────────────────────────────
// calcularRacha
// ─────────────────────────────────────────────

export function calcularRacha(transacciones: Transaccion[]): Racha {
  if (transacciones.length === 0) {
    return { dias: 0, activa: false, enRiesgo: false };
  }

  // Obtener conjunto de fechas únicas con actividad
  const diasConTx = new Set<string>();
  for (const tx of transacciones) {
    diasConTx.add(tx.fecha.split("T")[0]);
  }

  const hoy = new Date();
  const hoyStr = hoy.toISOString().split("T")[0];
  const ayerStr = new Date(hoy.getTime() - 86400000).toISOString().split("T")[0];

  const tieneHoy = diasConTx.has(hoyStr);
  const tieneAyer = diasConTx.has(ayerStr);

  // Si no tiene ni hoy ni ayer, racha rota
  if (!tieneHoy && !tieneAyer) {
    return { dias: 0, activa: false, enRiesgo: false };
  }

  // Contar racha hacia atrás desde el último día activo
  const inicio = tieneHoy ? hoy : new Date(hoy.getTime() - 86400000);
  let dias = 0;
  const cursor = new Date(inicio);

  while (true) {
    const fechaStr = cursor.toISOString().split("T")[0];
    if (!diasConTx.has(fechaStr)) break;
    dias++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const enRiesgo = !tieneHoy && tieneAyer;
  const activa = tieneHoy || tieneAyer;

  return { dias, activa, enRiesgo };
}

// ─────────────────────────────────────────────
// calcularXP
// ─────────────────────────────────────────────

export function calcularXP(transacciones: Transaccion[], logrosIds: string[]): number {
  const xpPorTx = transacciones.length * 10;
  const xpLogros = logrosIds.reduce((suma, id) => {
    const logro = CATALOGO_LOGROS.find((l) => l.id === id);
    return suma + (logro?.xp ?? 0);
  }, 0);
  return xpPorTx + xpLogros;
}

// ─────────────────────────────────────────────
// obtenerNivel
// ─────────────────────────────────────────────

export function obtenerNivel(xp: number): NivelActual {
  let nivelActual = NIVELES[0];
  let indiceActual = 0;

  for (let i = NIVELES.length - 1; i >= 0; i--) {
    if (xp >= NIVELES[i].min) {
      nivelActual = NIVELES[i];
      indiceActual = i;
      break;
    }
  }

  const siguienteNivel = NIVELES[indiceActual + 1] ?? null;
  const xpSiguiente = siguienteNivel ? siguienteNivel.min : nivelActual.min;
  const xpActual = xp - nivelActual.min;
  const rango = xpSiguiente - nivelActual.min;
  const progreso = siguienteNivel ? Math.min(100, Math.round((xpActual / rango) * 100)) : 100;

  return {
    ...nivelActual,
    xpActual: xp,
    xpSiguiente,
    progreso,
  };
}

// ─────────────────────────────────────────────
// laniMood
// ─────────────────────────────────────────────

export function laniMood(score: number): { emoji: string; texto: string } {
  if (score < 20) return { emoji: "😰", texto: "Oye, esto está difícil…" };
  if (score < 40) return { emoji: "😟", texto: "Hay que ordenar esto" };
  if (score < 60) return { emoji: "😐", texto: "Ni bien ni mal" };
  if (score < 80) return { emoji: "😊", texto: "¡Vas bien!" };
  return { emoji: "🎉", texto: "¡Estás brillando!" };
}

// ─────────────────────────────────────────────
// perfilGasto
// ─────────────────────────────────────────────

const PERFILES: Record<string, { emoji: string; label: string }> = {
  Comida: { emoji: "🍕", label: "Foodie" },
  Transporte: { emoji: "🚗", label: "Siempre en movimiento" },
  Entretenimiento: { emoji: "🎬", label: "Hedonista" },
  Supermercado: { emoji: "🛒", label: "Cocinero en casa" },
  Ropa: { emoji: "👕", label: "Fashion victim" },
  Salud: { emoji: "💊", label: "Health freak" },
  Servicios: { emoji: "⚡", label: "Suscripto a todo" },
  Hogar: { emoji: "🏠", label: "Homebody" },
  Educación: { emoji: "📚", label: "Siempre aprendiendo" },
  Otros: { emoji: "📦", label: "Misterioso" },
};

export function perfilGasto(transacciones: Transaccion[]): PerfilGasto | null {
  const gastos = transacciones.filter((t) => t.tipo === "gasto");
  if (gastos.length === 0) return null;

  const porCategoria: Record<string, number> = {};
  for (const tx of gastos) {
    const cat = tx.categoria || "Otros";
    porCategoria[cat] = (porCategoria[cat] ?? 0) + Number(tx.monto);
  }

  const topCategoria = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
  if (!topCategoria) return null;

  const [categoria] = topCategoria;
  const perfil = PERFILES[categoria] ?? PERFILES["Otros"];

  return { ...perfil, categoria };
}

// ─────────────────────────────────────────────
// mejorMes
// ─────────────────────────────────────────────

export function mejorMes(transacciones: Transaccion[]): MejorMes | null {
  if (transacciones.length === 0) return null;

  const porMes: Record<string, { ingresos: number; gastos: number }> = {};

  for (const tx of transacciones) {
    const fecha = new Date(tx.fecha + "T12:00:00");
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    if (!porMes[clave]) porMes[clave] = { ingresos: 0, gastos: 0 };
    if (tx.tipo === "ingreso") porMes[clave].ingresos += Number(tx.monto);
    else porMes[clave].gastos += Number(tx.monto);
  }

  let mejorClave: string | null = null;
  let mejorBalance = -Infinity;

  for (const [clave, datos] of Object.entries(porMes)) {
    const balance = datos.ingresos - datos.gastos;
    if (balance > mejorBalance) {
      mejorBalance = balance;
      mejorClave = clave;
    }
  }

  if (!mejorClave || mejorBalance <= 0) return null;

  const [anio, mes] = mejorClave.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, 1);
  const nombreMes = fecha.toLocaleString("es-MX", { month: "long", year: "numeric" });

  return { monto: mejorBalance, mes: nombreMes };
}

// ─────────────────────────────────────────────
// generarReto
// ─────────────────────────────────────────────

export function generarReto(transacciones: Transaccion[]): Reto {
  const hoy = new Date();
  const inicioSemanaActual = new Date(hoy);
  inicioSemanaActual.setDate(hoy.getDate() - hoy.getDay());
  inicioSemanaActual.setHours(0, 0, 0, 0);

  const inicioSemanaAnterior = new Date(inicioSemanaActual);
  inicioSemanaAnterior.setDate(inicioSemanaActual.getDate() - 7);

  // Gastos semana pasada por categoría
  const catSemanaAnterior: Record<string, number> = {};
  const catSemanaActual: Record<string, number> = {};

  for (const tx of transacciones) {
    if (tx.tipo !== "gasto") continue;
    const fecha = new Date(tx.fecha + "T12:00:00");
    const cat = tx.categoria || "Otros";

    if (fecha >= inicioSemanaAnterior && fecha < inicioSemanaActual) {
      catSemanaAnterior[cat] = (catSemanaAnterior[cat] ?? 0) + Number(tx.monto);
    }
    if (fecha >= inicioSemanaActual && fecha <= hoy) {
      catSemanaActual[cat] = (catSemanaActual[cat] ?? 0) + Number(tx.monto);
    }
  }

  const topCategoria = Object.entries(catSemanaAnterior).sort((a, b) => b[1] - a[1])[0];

  // Reto de registro de movimientos (fallback)
  const retoRegistro: Reto = {
    emoji: "📝",
    titulo: "Registra esta semana",
    descripcion: "Registra 10 movimientos esta semana",
    progreso: 0,
    meta: 10,
    unidad: "movimientos",
  };

  if (!topCategoria) {
    // Contar movimientos semana actual para el fallback
    const movimientosSemana = transacciones.filter((tx) => {
      const fecha = new Date(tx.fecha + "T12:00:00");
      return fecha >= inicioSemanaActual && fecha <= hoy;
    }).length;
    return { ...retoRegistro, progreso: movimientosSemana };
  }

  const [categoria, montoSemanaAnterior] = topCategoria;
  const meta = Math.round(montoSemanaAnterior * 0.8); // reducir 20%
  const progreso = catSemanaActual[categoria] ?? 0;
  const perfil = PERFILES[categoria] ?? PERFILES["Otros"];

  return {
    emoji: perfil.emoji,
    titulo: `Menos ${categoria} esta semana`,
    descripcion: `La semana pasada gastaste $${montoSemanaAnterior.toFixed(0)} en ${categoria}. ¿Puedes quedarte en $${meta.toFixed(0)}?`,
    progreso,
    meta,
    unidad: "pesos",
  };
}

// ─────────────────────────────────────────────
// detectarNuevosLogros
// ─────────────────────────────────────────────

export function detectarNuevosLogros(
  transacciones: Transaccion[],
  logrosActuales: string[],
  racha: number,
  scorePts: number,
): string[] {
  const nuevos: string[] = [];

  const yaDesbloqueado = (id: string) => logrosActuales.includes(id);
  const desbloquear = (id: string) => {
    if (!yaDesbloqueado(id)) nuevos.push(id);
  };

  // primer_registro: al menos 1 transacción
  if (transacciones.length >= 1) desbloquear("primer_registro");

  // primer_ingreso: al menos 1 ingreso
  if (transacciones.some((t) => t.tipo === "ingreso")) desbloquear("primer_ingreso");

  // rachas
  if (racha >= 7) desbloquear("racha_7");
  if (racha >= 14) desbloquear("racha_14");
  if (racha >= 30) desbloquear("racha_30");

  // registros
  if (transacciones.length >= 50) desbloquear("registros_50");
  if (transacciones.length >= 100) desbloquear("registros_100");

  // ahorro mensual — revisar cada mes en el historial
  const porMes: Record<string, { ingresos: number; gastos: number }> = {};
  for (const tx of transacciones) {
    const fecha = new Date(tx.fecha + "T12:00:00");
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    if (!porMes[clave]) porMes[clave] = { ingresos: 0, gastos: 0 };
    if (tx.tipo === "ingreso") porMes[clave].ingresos += Number(tx.monto);
    else porMes[clave].gastos += Number(tx.monto);
  }

  for (const datos of Object.values(porMes)) {
    if (datos.ingresos > 0) {
      const tasaAhorro = (datos.ingresos - datos.gastos) / datos.ingresos;
      if (tasaAhorro > 0.1) desbloquear("ahorro_10");
      if (tasaAhorro > 0.2) desbloquear("ahorro_20");
    }
  }

  // score_80
  if (scorePts >= 80) desbloquear("score_80");

  // viajero — alguna tx con viaje_id (campo extendido)
  if (transacciones.some((t) => (t as Transaccion & { viaje_id?: string }).viaje_id)) {
    desbloquear("viajero");
  }

  // meta_cumplida — placeholder, detectado externamente; no auto-detectar aquí

  return nuevos;
}
