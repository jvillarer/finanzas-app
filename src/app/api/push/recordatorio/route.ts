import { NextRequest } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron: se ejecuta cada lunes y jueves a las 10am hora México (UTC-6)
// Envía recordatorio quincenal de importar estado de cuenta.
// También envía "check-in" de actividad si el usuario lleva más de 3 días sin registrar.

webpush.setVapidDetails(
  "mailto:lani@finanzas.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Supabase admin client (service role) para leer todas las suscripciones
function crearSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PushSuscripcion {
  usuario_id: string;
  suscripcion: PushSubscriptionJSON;
  endpoint: string;
}

interface UltimaTransaccion {
  usuario_id: string;
  fecha: string;
}

export async function GET(req: NextRequest) {
  // Verificar clave secreta del cron para evitar llamadas externas
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("No autorizado", { status: 401 });
  }

  const supabase = crearSupabaseAdmin();

  // Obtener todas las suscripciones push activas
  const { data: suscripciones, error } = await supabase
    .from("push_suscripciones")
    .select("usuario_id, suscripcion, endpoint");

  if (error || !suscripciones?.length) {
    return Response.json({ ok: true, enviados: 0 });
  }

  // Obtener la última transacción por usuario para detectar inactividad
  const usuariosIds = suscripciones.map((s: PushSuscripcion) => s.usuario_id);
  const { data: ultimasTx } = await supabase
    .from("transacciones")
    .select("usuario_id, fecha")
    .in("usuario_id", usuariosIds)
    .order("fecha", { ascending: false });

  // Mapear última fecha de transacción por usuario
  const ultimaTxPorUsuario: Record<string, string> = {};
  for (const tx of (ultimasTx || []) as UltimaTransaccion[]) {
    if (!ultimaTxPorUsuario[tx.usuario_id]) {
      ultimaTxPorUsuario[tx.usuario_id] = tx.fecha;
    }
  }

  const hoy = new Date();
  let enviados = 0;

  for (const sus of suscripciones as PushSuscripcion[]) {
    const ultimaFecha = ultimaTxPorUsuario[sus.usuario_id];
    const diasSinActividad = ultimaFecha
      ? Math.floor((hoy.getTime() - new Date(ultimaFecha + "T12:00:00").getTime()) / 86400000)
      : 999;

    let payload: { title: string; body: string; url: string } | null = null;

    // Recordatorio de inactividad (3+ días sin registrar)
    if (diasSinActividad >= 3 && diasSinActividad < 30) {
      payload = {
        title: "Lani 🐑",
        body: diasSinActividad === 3
          ? "Llevas 3 días sin registrar nada. ¿Qué has gastado?"
          : `${diasSinActividad} días sin anotar. ¿Me cuentas qué ha pasado?`,
        url: "/chat",
      };
    }

    // Recordatorio quincenal de PDF (días 1 y 16 del mes)
    const diaMes = hoy.getDate();
    if (diaMes === 1 || diaMes === 16) {
      payload = {
        title: "Lani 🐑 — Es quincena",
        body: "Sube tu estado de cuenta y yo categorizo todo en segundos.",
        url: "/subir-archivo",
      };
    }

    if (!payload) continue;

    try {
      await webpush.sendNotification(
        sus.suscripcion as webpush.PushSubscription,
        JSON.stringify(payload)
      );
      enviados++;
    } catch (err: unknown) {
      // Si el endpoint ya no es válido, eliminar la suscripción
      const webPushError = err as { statusCode?: number };
      if (webPushError?.statusCode === 404 || webPushError?.statusCode === 410) {
        await supabase.from("push_suscripciones").delete().eq("endpoint", sus.endpoint);
      }
    }
  }

  return Response.json({ ok: true, enviados });
}
