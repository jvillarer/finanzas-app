import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enviarMensajeWA } from "@/lib/whatsapp";
import { clasificarDeduccion, calcularDevolucion, ETIQUETAS_DEDUCCION } from "@/lib/isr-calculator";

// ─────────────────────────────────────────────────────────────────────────────
// Lani proactiva — cron diario a las 9am hora México (15:00 UTC)
//
// Tres disparadores por usuario:
//  1. sin_registro   → No ha registrado nada en 7+ días → nudge
//  2. presupuesto    → Categoría ≥ 80% de límite → alerta por categoría
//  3. gastos_fijos   → Días 1 y 16 → aviso de compromisos próximos
//
// Deduplicación vía tabla notificaciones_enviadas.
// Cada tipo tiene su propia cadencia para no spammear.
// ─────────────────────────────────────────────────────────────────────────────

function crearSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

// Verifica si ya se envió una notificación de este tipo en los últimos N días
async function yaEnviada(
  supabase: ReturnType<typeof crearSupabaseAdmin>,
  usuarioId: string,
  tipo: string,
  diasAtras: number
): Promise<boolean> {
  const desde = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("notificaciones_enviadas")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("tipo", tipo)
    .gte("enviado_en", desde)
    .maybeSingle();
  return !!data;
}

async function registrarEnviada(
  supabase: ReturnType<typeof crearSupabaseAdmin>,
  usuarioId: string,
  tipo: string
) {
  await supabase.from("notificaciones_enviadas").insert({ usuario_id: usuarioId, tipo });
}

// ── Disparador 1: Sin registro ───────────────────────────────────────────────
async function revisarSinRegistro(
  supabase: ReturnType<typeof crearSupabaseAdmin>,
  usuarioId: string,
  telefono: string,
  nombre: string
) {
  const tipo = "sin_registro";
  if (await yaEnviada(supabase, usuarioId, tipo, 7)) return;

  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { count } = await supabase
    .from("transacciones")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .gte("fecha", hace7dias);

  if ((count ?? 0) > 0) return; // Sí registró en los últimos 7 días

  const nombreCorto = nombre.split(" ")[0] || nombre;
  const msg =
    `Oye ${nombreCorto}, ¿todo bien? 🐑\n\n` +
    `Llevas 7 días sin registrar nada. No te pido que seas perfecto, pero perder el hilo cuesta caro.\n\n` +
    `¿Qué fue lo último que gastaste? Dímelo y lo anoto al tiro.`;

  await enviarMensajeWA(telefono, msg);
  await registrarEnviada(supabase, usuarioId, tipo);
  console.log(`✅ sin_registro enviado a ${telefono}`);
}

// ── Disparador 2: Presupuesto en alerta ──────────────────────────────────────
async function revisarPresupuestos(
  supabase: ReturnType<typeof crearSupabaseAdmin>,
  usuarioId: string,
  telefono: string,
  nombre: string
) {
  const hoy = new Date();
  const mesActual = hoy.toISOString().slice(0, 7); // YYYY-MM
  const tipoClave = `presupuesto_${mesActual}`;

  // Máximo una alerta de presupuesto por día por usuario
  if (await yaEnviada(supabase, usuarioId, tipoClave, 1)) return;

  const [{ data: presupuestos }, { data: transacciones }] = await Promise.all([
    supabase
      .from("presupuestos")
      .select("categoria, limite")
      .eq("usuario_id", usuarioId),
    supabase
      .from("transacciones")
      .select("categoria, monto, tipo")
      .eq("usuario_id", usuarioId)
      .eq("tipo", "gasto")
      .gte("fecha", mesActual + "-01")
      .lte("fecha", mesActual + "-31"),
  ]);

  if (!presupuestos?.length) return;

  // Calcular gasto por categoría este mes
  const gastoPorCat: Record<string, number> = {};
  for (const tx of transacciones ?? []) {
    gastoPorCat[tx.categoria] = (gastoPorCat[tx.categoria] || 0) + Number(tx.monto);
  }

  // Categorías ≥ 80% del límite
  const alertas = presupuestos
    .map((p) => ({
      categoria: p.categoria,
      limite: Number(p.limite),
      gastado: gastoPorCat[p.categoria] || 0,
      pct: ((gastoPorCat[p.categoria] || 0) / Number(p.limite)) * 100,
    }))
    .filter((p) => p.pct >= 80)
    .sort((a, b) => b.pct - a.pct);

  if (!alertas.length) return;

  const nombreCorto = nombre.split(" ")[0] || nombre;
  const superados = alertas.filter((a) => a.pct >= 100);
  const enRiesgo  = alertas.filter((a) => a.pct >= 80 && a.pct < 100);

  let msg = `⚠️ *Alerta de presupuesto*, ${nombreCorto}\n\n`;

  if (superados.length > 0) {
    msg += `*Ya te pasaste:*\n`;
    for (const a of superados.slice(0, 3)) {
      msg += `🔴 ${a.categoria}: ${fmt(a.gastado)} / ${fmt(a.limite)} (+${fmt(a.gastado - a.limite)})\n`;
    }
    msg += "\n";
  }

  if (enRiesgo.length > 0) {
    msg += `*Casi en el límite:*\n`;
    for (const a of enRiesgo.slice(0, 3)) {
      msg += `🟡 ${a.categoria}: ${fmt(a.gastado)} de ${fmt(a.limite)} (${Math.round(a.pct)}%)\n`;
    }
    msg += "\n";
  }

  msg += superados.length > 0
    ? `¿Quieres ajustar el presupuesto o ya sabías que ibas a rebasar?`
    : `Todavía puedes controlarlo. ¿Cómo vas?`;

  await enviarMensajeWA(telefono, msg);
  await registrarEnviada(supabase, usuarioId, tipoClave);
  console.log(`✅ presupuesto_alerta enviado a ${telefono} — ${alertas.length} categorías`);
}

// ── Disparador 3: Gastos fijos próximos (días 1 y 16) ───────────────────────
async function revisarGastosFijos(
  supabase: ReturnType<typeof crearSupabaseAdmin>,
  usuarioId: string,
  telefono: string,
  nombre: string,
  diaMX: number
) {
  // Solo los días 1 y 16
  if (diaMX !== 1 && diaMX !== 16) return;

  const hoy = new Date();
  const mesActual = hoy.toISOString().slice(0, 7);
  const tipoClave = `gastos_fijos_${mesActual}-${diaMX}`;

  if (await yaEnviada(supabase, usuarioId, tipoClave, 1)) return;

  // Obtener compromisos MSI activos
  const { data: msiActivos } = await supabase
    .from("compromisos_msi")
    .select("descripcion, mensualidad, meses_total, meses_pagados, fecha_proximo_pago")
    .eq("usuario_id", usuarioId)
    .eq("activo", true)
    .order("mensualidad", { ascending: false });

  if (!msiActivos?.length) return;

  const totalMSI = msiActivos.reduce((s, m) => s + Number(m.mensualidad), 0);
  const nombreCorto = nombre.split(" ")[0] || nombre;
  const quincena = diaMX === 1 ? "primera" : "segunda";

  let msg = `📋 *Compromisos de esta quincena*, ${nombreCorto}\n\n`;

  for (const msi of msiActivos.slice(0, 5)) {
    const pagados   = Number(msi.meses_pagados);
    const total     = Number(msi.meses_total);
    const restantes = Math.max(0, total - pagados);
    msg += `💳 ${msi.descripcion}: ${fmt(Number(msi.mensualidad))} (${restantes} mese${restantes !== 1 ? "s" : ""} restante${restantes !== 1 ? "s" : ""})\n`;
  }

  if (msiActivos.length > 5) {
    msg += `_...y ${msiActivos.length - 5} más_\n`;
  }

  msg += `\n*Total comprometido: ${fmt(totalMSI)}*\n\n`;
  msg += `Es la ${quincena} quincena del mes. Ya sabes a qué atenerte 💪`;

  await enviarMensajeWA(telefono, msg);
  await registrarEnviada(supabase, usuarioId, tipoClave);
  console.log(`✅ gastos_fijos enviado a ${telefono} — día ${diaMX}`);
}

// ── Disparador 4: Temporada de declaración anual (enero y febrero) ───────────
async function revisarDeclaracionAnual(
  supabase: ReturnType<typeof crearSupabaseAdmin>,
  usuarioId: string,
  telefono: string,
  nombre: string,
  mesMX: number,
  anoMX: number
) {
  // Solo en enero (mes 1) y febrero (mes 2)
  if (mesMX !== 1 && mesMX !== 2) return;

  const anoPasado = anoMX - 1;
  const tipoClave = `declaracion_${anoPasado}`;

  // Solo una vez por año fiscal (30 días de cadencia)
  if (await yaEnviada(supabase, usuarioId, tipoClave, 30)) return;

  // Obtener todos los gastos deducibles del año pasado
  const [{ data: txsDeducibles }, { data: txsIngresos }] = await Promise.all([
    supabase
      .from("transacciones")
      .select("monto, descripcion, categoria")
      .eq("usuario_id", usuarioId)
      .eq("tipo", "gasto")
      .gte("fecha", `${anoPasado}-01-01`)
      .lte("fecha", `${anoPasado}-12-31`)
      .in("categoria", ["Salud", "Educación", "Servicios", "Otros"]),
    supabase
      .from("transacciones")
      .select("monto")
      .eq("usuario_id", usuarioId)
      .eq("tipo", "ingreso")
      .gte("fecha", `${anoPasado}-01-01`)
      .lte("fecha", `${anoPasado}-12-31`),
  ]);

  // Clasificar y sumar deducibles
  const totalesPorTipo: Record<string, number> = {};
  for (const d of txsDeducibles ?? []) {
    const tipo = clasificarDeduccion(d.categoria, d.descripcion);
    if (tipo) totalesPorTipo[tipo] = (totalesPorTipo[tipo] || 0) + Number(d.monto);
  }

  const totalDeducible = Object.values(totalesPorTipo).reduce((s, v) => s + v, 0);
  if (totalDeducible === 0) return; // Sin deducciones registradas, no hay nada útil que decir

  const ingresoAnual = (txsIngresos ?? []).reduce((s, t) => s + Number(t.monto), 0);
  const resultado = calcularDevolucion(ingresoAnual, totalDeducible);

  const nombreCorto = nombre.split(" ")[0] || nombre;

  let msg = `📋 *Temporada de declaración anual ${anoPasado}*, ${nombreCorto}\n\n`;
  msg += `En ${anoPasado} registraste *${fmt(totalDeducible)}* en gastos deducibles:\n`;

  for (const [tipo, total] of Object.entries(totalesPorTipo)) {
    const etiqueta = ETIQUETAS_DEDUCCION[tipo as keyof typeof ETIQUETAS_DEDUCCION];
    msg += `• ${etiqueta}: ${fmt(total)}\n`;
  }

  if (resultado.devolucionEstimada > 0) {
    msg += `\n💰 *Devolución estimada: ${fmt(resultado.devolucionEstimada)}*\n`;
    msg += `\nEse dinero no se recupera solo — hay que presentar la declaración antes del 30 de abril. ¿Lo revisamos?`;
  } else {
    msg += `\n¿Ya tienes todo listo para tu declaración anual?`;
  }

  await enviarMensajeWA(telefono, msg);
  await registrarEnviada(supabase, usuarioId, tipoClave);
  console.log(`✅ declaracion_anual enviado a ${telefono} — ${anoPasado}, devolución ${resultado.devolucionEstimada}`);
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const supabase = crearSupabaseAdmin();

  // Hora México (UTC-6)
  const ahoraUTC = new Date();
  const ahoraMX  = new Date(ahoraUTC.getTime() - 6 * 60 * 60 * 1000);
  const diaMX    = ahoraMX.getDate();
  const mesMX    = ahoraMX.getMonth() + 1; // 1-12
  const anoMX    = ahoraMX.getFullYear();

  // Obtener todos los usuarios con WhatsApp vinculado
  const { data: perfiles, error } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, telefono_whatsapp")
    .not("telefono_whatsapp", "is", null)
    .neq("telefono_whatsapp", "");

  if (error) {
    console.error("Error obteniendo perfiles:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!perfiles?.length) {
    return Response.json({ ok: true, procesados: 0 });
  }

  let procesados = 0;
  const errores: string[] = [];

  for (const perfil of perfiles) {
    const usuarioId = perfil.id as string;
    const telefono  = perfil.telefono_whatsapp as string;
    const nombre    = (perfil.nombre_completo as string) || "amigo";

    if (!telefono?.trim()) continue;

    try {
      // Los cuatro disparadores corren en paralelo por usuario
      await Promise.allSettled([
        revisarSinRegistro(supabase, usuarioId, telefono, nombre),
        revisarPresupuestos(supabase, usuarioId, telefono, nombre),
        revisarGastosFijos(supabase, usuarioId, telefono, nombre, diaMX),
        revisarDeclaracionAnual(supabase, usuarioId, telefono, nombre, mesMX, anoMX),
      ]);
      procesados++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errores.push(`${usuarioId}: ${msg}`);
      console.error(`Error procesando usuario ${usuarioId}:`, e);
    }
  }

  return Response.json({ ok: true, procesados, errores, diaMX });
}
