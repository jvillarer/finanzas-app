import { NextRequest } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron: se ejecuta a las 4am UTC = 10pm hora México (UTC-6)
// Detecta usuarios con racha en riesgo (registraron ayer pero no hoy)
// y les manda un push para que no la pierdan.

webpush.setVapidDetails(
  "mailto:lani@finanzas.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function crearSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PushSuscripcion {
  usuario_id: string;
  suscripcion: webpush.PushSubscription;
  endpoint: string;
}

export async function GET(req: NextRequest) {
  // Verificar secreto del cron para evitar llamadas externas
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("No autorizado", { status: 401 });
  }

  // Fechas en hora México (UTC-6)
  const ahoraUTC = new Date();
  const ahoraMX = new Date(ahoraUTC.getTime() - 6 * 60 * 60 * 1000);
  const hoyMX = ahoraMX.toISOString().split("T")[0];
  const ayerMX = new Date(ahoraMX.getTime() - 86400000).toISOString().split("T")[0];

  const supabase = crearSupabaseAdmin();

  // Buscar usuarios que:
  // 1. Tienen push activo
  // 2. Registraron algo ayer (racha viva)
  // 3. NO registraron nada hoy (racha en riesgo)
  const { data: suscripciones, error } = await supabase
    .from("push_suscripciones")
    .select("usuario_id, suscripcion, endpoint");

  if (error || !suscripciones?.length) {
    return Response.json({ ok: true, enviados: 0, motivo: "sin suscripciones" });
  }

  // Obtener los usuarios con transacciones hoy y ayer (una sola query)
  const usuariosIds = (suscripciones as PushSuscripcion[]).map((s) => s.usuario_id);

  const { data: transacciones } = await supabase
    .from("transacciones")
    .select("usuario_id, fecha")
    .in("usuario_id", usuariosIds)
    .in("fecha", [hoyMX, ayerMX]);

  // Mapear qué usuarios tienen actividad hoy / ayer
  const tieneHoy = new Set<string>();
  const tieneAyer = new Set<string>();

  for (const tx of (transacciones ?? []) as { usuario_id: string; fecha: string }[]) {
    if (tx.fecha === hoyMX) tieneHoy.add(tx.usuario_id);
    if (tx.fecha === ayerMX) tieneAyer.add(tx.usuario_id);
  }

  // Calcular racha de cada usuario en riesgo para personalizar el mensaje
  const { data: todasTxs } = await supabase
    .from("transacciones")
    .select("usuario_id, fecha")
    .in("usuario_id", usuariosIds)
    .gte("fecha", new Date(ahoraMX.getTime() - 35 * 86400000).toISOString().split("T")[0]);

  // Contar días consecutivos de racha por usuario
  const rachasPorUsuario: Record<string, number> = {};
  const txsPorUsuario: Record<string, Set<string>> = {};
  for (const tx of (todasTxs ?? []) as { usuario_id: string; fecha: string }[]) {
    if (!txsPorUsuario[tx.usuario_id]) txsPorUsuario[tx.usuario_id] = new Set();
    txsPorUsuario[tx.usuario_id].add(tx.fecha);
  }
  for (const [uid, fechas] of Object.entries(txsPorUsuario)) {
    // Contar desde ayer hacia atrás
    let dias = 0;
    const cursor = new Date(ahoraMX.getTime() - 86400000); // ayer
    while (true) {
      const f = cursor.toISOString().split("T")[0];
      if (!fechas.has(f)) break;
      dias++;
      cursor.setDate(cursor.getDate() - 1);
    }
    rachasPorUsuario[uid] = dias;
  }

  let enviados = 0;

  for (const sus of suscripciones as PushSuscripcion[]) {
    const uid = sus.usuario_id;

    // Solo usuarios con racha activa en riesgo: registraron ayer pero no hoy
    if (!tieneAyer.has(uid) || tieneHoy.has(uid)) continue;

    const dias = rachasPorUsuario[uid] ?? 1;
    const emoji = dias >= 14 ? "🔥🔥" : "🔥";

    const payload = {
      title: `${emoji} Racha en riesgo — ${dias} días`,
      body: dias >= 7
        ? `Llevas ${dias} días seguidos. No la pierdas, ¡registra algo antes de medianoche!`
        : `Llevas ${dias} días seguidos registrando. ¡No cortes la racha hoy!`,
      url: "/chat",
    };

    try {
      await webpush.sendNotification(sus.suscripcion, JSON.stringify(payload));
      enviados++;
    } catch (err: unknown) {
      const webPushError = err as { statusCode?: number };
      if (webPushError?.statusCode === 404 || webPushError?.statusCode === 410) {
        await supabase.from("push_suscripciones").delete().eq("endpoint", sus.endpoint);
      }
    }
  }

  return Response.json({ ok: true, enviados, hoyMX, ayerMX });
}
