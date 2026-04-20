import webpush from "web-push";
import { createServerSupabase } from "@/lib/supabase-server";

// POST /api/push/test
// Manda una notificación de prueba al usuario autenticado.
// Solo para desarrollo/pruebas, no exponer en producción permanente.

webpush.setVapidDetails(
  "mailto:lani@finanzas.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("No autorizado", { status: 401 });

    const { data: suscripciones } = await supabase
      .from("push_suscripciones")
      .select("suscripcion, endpoint")
      .eq("usuario_id", user.id);

    if (!suscripciones?.length) {
      return Response.json({ ok: false, motivo: "Sin suscripciones activas para este usuario" });
    }

    const payload = JSON.stringify({
      title: "🔥 Racha en riesgo — 7 días",
      body: "Llevas 7 días seguidos registrando. No la pierdas, ¡registra algo antes de medianoche!",
      url: "/chat",
    });

    let enviados = 0;
    for (const sus of suscripciones) {
      try {
        await webpush.sendNotification(sus.suscripcion as webpush.PushSubscription, payload);
        enviados++;
      } catch (err: unknown) {
        const e = err as { statusCode?: number };
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from("push_suscripciones").delete().eq("endpoint", sus.endpoint);
        }
      }
    }

    return Response.json({ ok: true, enviados });
  } catch (err) {
    console.error("Error en /api/push/test:", err);
    return new Response("Error interno", { status: 500 });
  }
}
