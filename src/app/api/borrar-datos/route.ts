import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function DELETE() {
  const supabase = await createServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = user.id;

  // Obtener teléfono para limpiar historial de WhatsApp
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("telefono_whatsapp")
    .eq("id", userId)
    .single();
  const telefono = perfil?.telefono_whatsapp ?? null;

  // Borrar todos los datos del usuario manteniendo la cuenta activa
  const borrados = await Promise.all([
    supabase.from("transacciones").delete().eq("usuario_id", userId),
    supabase.from("metas").delete().eq("usuario_id", userId),
    supabase.from("presupuestos").delete().eq("usuario_id", userId),
    // Historial de conversación y dedup de WhatsApp (solo si tiene teléfono vinculado)
    ...(telefono
      ? [
          supabase.from("mensajes_wa").delete().eq("telefono", telefono),
          supabase.from("webhook_wa_procesados").delete().eq("telefono", telefono),
        ]
      : []),
  ]);

  const [txResult, metasResult, presupuestosResult] = borrados;

  if (txResult.error) {
    console.error("Error borrando transacciones:", txResult.error);
    return NextResponse.json({ error: "Error al borrar transacciones" }, { status: 500 });
  }

  // El resto no bloquea aunque fallen
  if (metasResult.error) console.warn("Metas:", metasResult.error.message);
  if (presupuestosResult.error) console.warn("Presupuestos:", presupuestosResult.error.message);

  return NextResponse.json({ ok: true });
}
