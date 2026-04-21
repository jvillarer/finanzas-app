import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";

export async function DELETE() {
  // Obtener el usuario autenticado con el cliente server-side (cookie-based)
  const supabaseServer = await createServerSupabase();
  const { data: { user }, error: userError } = await supabaseServer.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = user.id;

  // Cliente admin con service role key (para eliminar auth.users)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Configuración incompleta del servidor" }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Eliminar transacciones
  const { error: txError } = await supabaseAdmin
    .from("transacciones")
    .delete()
    .eq("usuario_id", userId);

  if (txError) {
    console.error("Error eliminando transacciones:", txError);
    return NextResponse.json({ error: "Error al eliminar transacciones" }, { status: 500 });
  }

  // 2. Eliminar presupuestos (si existen)
  await supabaseAdmin.from("presupuestos").delete().eq("usuario_id", userId);

  // 3. Eliminar perfil
  const { error: perfilError } = await supabaseAdmin
    .from("perfiles")
    .delete()
    .eq("id", userId);

  if (perfilError) {
    console.error("Error eliminando perfil:", perfilError);
    // No bloqueamos si la tabla no existe o no tiene fila
  }

  // 4. Eliminar usuario de auth (esto también elimina la sesión)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) {
    console.error("Error eliminando usuario auth:", authError);
    return NextResponse.json({ error: "Error al eliminar la cuenta" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
