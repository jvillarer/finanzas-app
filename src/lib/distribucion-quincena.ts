import type { SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Distribución inteligente de quincena
// Se llama después de registrar un ingreso ≥ $5,000 vía WhatsApp.
// Analiza gastos recurrentes, MSI, metas y devuelve un mensaje WA listo.
// ─────────────────────────────────────────────────────────────────────────────

interface TransaccionSimple {
  monto: number;
  descripcion: string;
  categoria: string;
  tipo: string;
  fecha: string;
}

interface CompromisoMSI {
  descripcion: string;
  mensualidad: number;
}

interface MetaAhorro {
  nombre: string;
  emoji: string;
  monto_objetivo: number;
  monto_actual: number;
}

interface LineaDistribucion {
  etiqueta: string;
  monto: number;
  emoji: string;
}

// Normaliza texto para comparación de recurrentes
function normalizar(desc: string): string {
  return desc
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Detecta gastos recurrentes: misma descripción ≥ 2 meses distintos con CV ≤ 30%
function detectarRecurrentes(transacciones: TransaccionSimple[]): LineaDistribucion[] {
  const hace3Meses = new Date();
  hace3Meses.setMonth(hace3Meses.getMonth() - 3);
  const corte = hace3Meses.toISOString().split("T")[0];

  const gastos = transacciones.filter(
    (t) => t.tipo === "gasto" && t.fecha >= corte && t.descripcion?.trim()
  );

  // Agrupar por descripción normalizada
  const grupos: Record<string, TransaccionSimple[]> = {};
  for (const t of gastos) {
    const clave = normalizar(t.descripcion);
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(t);
  }

  const recurrentes: LineaDistribucion[] = [];
  for (const [, txs] of Object.entries(grupos)) {
    const mesesUnicos = new Set(txs.map((t) => t.fecha.slice(0, 7)));
    if (mesesUnicos.size < 2) continue;

    const montos = txs.map((t) => Number(t.monto));
    const promedio = montos.reduce((s, m) => s + m, 0) / montos.length;
    const varianza = montos.reduce((s, m) => s + Math.pow(m - promedio, 2), 0) / montos.length;
    const cv = promedio > 0 ? Math.sqrt(varianza) / promedio : 1;
    if (cv > 0.30) continue;

    const ordenadas = [...txs].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const desc = ordenadas[0].descripcion.trim();
    const cat = ordenadas[0].categoria;

    const EMOJIS: Record<string, string> = {
      Servicios: "⚡", Hogar: "🏠", Entretenimiento: "🎬",
      Salud: "💊", Educación: "📚", Transporte: "🚗", Otros: "📦",
    };

    recurrentes.push({
      etiqueta: desc,
      monto: Math.round(promedio),
      emoji: EMOJIS[cat] || "💳",
    });
  }

  return recurrentes.sort((a, b) => b.monto - a.monto).slice(0, 4);
}

// Calcula la etiqueta del período quincena actual (ej: "Q1-2026-04")
export function periodoQuincenaActual(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const quincena = hoy.getDate() <= 15 ? "Q1" : "Q2";
  return `distribucion_${quincena}-${anio}-${mes}`;
}

// ── Función principal ─────────────────────────────────────────────────────────
export async function calcularDistribucionQuincena(
  supabase: SupabaseClient,
  usuarioId: string,
  montoIngreso: number,
  nombre: string
): Promise<string | null> {
  // 1. Verificar que no se haya enviado ya esta quincena
  const tipoClave = periodoQuincenaActual();
  const hace15dias = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const { data: yaEnviado } = await supabase
    .from("notificaciones_enviadas")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("tipo", tipoClave)
    .gte("enviado_en", hace15dias)
    .maybeSingle();

  if (yaEnviado) return null; // Ya se mandó este período

  // 2. Cargar datos en paralelo
  const [
    { data: transacciones },
    { data: compromisosMSI },
    { data: todasMetas },
  ] = await Promise.all([
    supabase
      .from("transacciones")
      .select("monto, descripcion, categoria, tipo, fecha")
      .eq("usuario_id", usuarioId)
      .gte("fecha", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("fecha", { ascending: false }),
    supabase
      .from("compromisos_msi")
      .select("descripcion, mensualidad, meses_total, meses_pagados")
      .eq("usuario_id", usuarioId)
      .eq("activo", true),
    supabase
      .from("metas")
      .select("nombre, emoji, monto_objetivo, monto_actual")
      .eq("usuario_id", usuarioId),
  ]);

  // Metas incompletas (filtrado en memoria para evitar comparación de columnas en Supabase)
  const metasFiltradas = (todasMetas ?? []).filter(
    (m: MetaAhorro) => Number(m.monto_actual) < Number(m.monto_objetivo)
  );

  // 3. MSI activos (obligaciones fijas) — separados de recurrentes para el mensaje
  const msiActivos = (compromisosMSI ?? []) as CompromisoMSI[];
  const lineasMSI: LineaDistribucion[] = [];
  let totalMSI = 0;
  for (const msi of msiActivos) {
    const mensualidad = Math.round(Number(msi.mensualidad));
    totalMSI += mensualidad;
    lineasMSI.push({ etiqueta: msi.descripcion, monto: mensualidad, emoji: "💳" });
  }

  // 4. Gastos recurrentes detectados (últimos 3 meses), sin duplicar MSI
  const recurrentes = detectarRecurrentes(transacciones ?? []);
  const lineasRec: LineaDistribucion[] = [];
  let totalRecurrentes = 0;
  for (const r of recurrentes) {
    const clavR = normalizar(r.etiqueta);
    const yaEnMSI = msiActivos.some((m) => {
      const clavM = normalizar(m.descripcion);
      return clavM.includes(clavR) || clavR.includes(clavM);
    });
    if (!yaEnMSI) {
      totalRecurrentes += r.monto;
      lineasRec.push(r);
    }
  }

  // 5. Sugerencia de meta principal (15% del ingreso, tope lo que falta)
  let metaSugerida: LineaDistribucion | null = null;
  if (metasFiltradas.length > 0) {
    const metaPrincipal = metasFiltradas[0] as MetaAhorro;
    const faltante  = Number(metaPrincipal.monto_objetivo) - Number(metaPrincipal.monto_actual);
    const sugerencia = Math.min(Math.round(montoIngreso * 0.15), Math.round(faltante));
    if (sugerencia > 0) {
      metaSugerida = {
        etiqueta: metaPrincipal.nombre,
        monto: sugerencia,
        emoji: metaPrincipal.emoji || "🎯",
      };
    }
  }

  // 6. Calcular disponible
  const totalFijo = totalMSI + totalRecurrentes + (metaSugerida?.monto ?? 0);
  const disponible = Math.max(0, montoIngreso - totalFijo);

  // 7. Construir mensaje WA
  const nombreCorto = nombre.split(" ")[0] || nombre;
  const fmt = (n: number) => `$${n.toLocaleString("es-MX")}`;

  let msg = `💰 *Distribución de tu quincena* (${fmt(montoIngreso)})\n\n`;

  const hayLineas = lineasMSI.length > 0 || lineasRec.length > 0 || metaSugerida;
  if (hayLineas) {
    msg += `*Compromisos y fijos:*\n`;
    for (const l of lineasMSI) {
      msg += `${l.emoji} ${l.etiqueta}: ${fmt(l.monto)}\n`;
    }
    for (const l of lineasRec) {
      msg += `${l.emoji} ${l.etiqueta}: ${fmt(l.monto)}\n`;
    }
    if (metaSugerida) {
      msg += `${metaSugerida.emoji} ${metaSugerida.etiqueta} (ahorro): ${fmt(metaSugerida.monto)}\n`;
    }
    msg += `\n*Libre para gastar: ${fmt(disponible)}*`;
  } else {
    msg += `Todo libre, no detecté compromisos fijos.\n*Disponible: ${fmt(disponible)}*`;
  }

  msg += `\n\n¡Adminístralo chido, ${nombreCorto}! 🐑`;

  // 8. Registrar que ya se envió
  await supabase.from("notificaciones_enviadas").insert({
    usuario_id: usuarioId,
    tipo: tipoClave,
  });

  return msg;
}
