import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

// POST /api/push/suscribir
// Guarda la suscripción push del navegador en Supabase para envío posterior.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("No autorizado", { status: 401 });

    const { suscripcion } = await req.json() as { suscripcion: PushSubscriptionJSON };
    if (!suscripcion?.endpoint) return new Response("Suscripción inválida", { status: 400 });

    // Upsert: si ya existe el endpoint, actualizar. Un usuario puede tener varios dispositivos.
    const { error } = await supabase
      .from("push_suscripciones")
      .upsert(
        { usuario_id: user.id, suscripcion, endpoint: suscripcion.endpoint },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("Error guardando suscripción push:", error);
      return new Response("Error al guardar suscripción", { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/push/suscribir:", err);
    return new Response("Error interno", { status: 500 });
  }
}

// DELETE /api/push/suscribir
// Elimina la suscripción push del usuario (cuando desactiva notificaciones).
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("No autorizado", { status: 401 });

    const { endpoint } = await req.json() as { endpoint: string };
    if (!endpoint) return new Response("Endpoint requerido", { status: 400 });

    await supabase
      .from("push_suscripciones")
      .delete()
      .eq("usuario_id", user.id)
      .eq("endpoint", endpoint);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error en DELETE /api/push/suscribir:", err);
    return new Response("Error interno", { status: 500 });
  }
}
