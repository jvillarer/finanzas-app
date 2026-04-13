import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function DELETE() {
  const supabase = await createServerSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = user.id;

  // Borrar todos los datos del usuario manteniendo la cuenta activa
  const [txResult, metasResult, presupuestosResult] = await Promise.all([
    supabase.from("transacciones").delete().eq("usuario_id", userId),
    supabase.from("metas").delete().eq("usuario_id", userId),
    supabase.from("presupuestos").delete().eq("usuario_id", userId),
  ]);

  if (txResult.error) {
    console.error("Error borrando transacciones:", txResult.error);
    return NextResponse.json({ error: "Error al borrar transacciones" }, { status: 500 });
  }

  // metas y presupuestos no bloquean aunque fallen (puede que no existan)
  if (metasResult.error) console.warn("Metas:", metasResult.error.message);
  if (presupuestosResult.error) console.warn("Presupuestos:", presupuestosResult.error.message);

  return NextResponse.json({ ok: true });
}
