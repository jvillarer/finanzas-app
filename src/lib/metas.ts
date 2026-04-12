import { createClient } from "./supabase";

export interface Meta {
  id: string;
  usuario_id: string;
  nombre: string;
  emoji: string;
  monto_objetivo: number;
  monto_actual: number;
  fecha_limite: string | null;
  created_at: string;
}

export interface MetaCalculo {
  restante: number;
  pct: number;
  completada: boolean;
  diasRestantes: number | null;
  porMes: number | null;
  urgente: boolean; // < 30 días y no completada
}

export function calcularMeta(meta: Meta): MetaCalculo {
  const restante = Math.max(meta.monto_objetivo - meta.monto_actual, 0);
  const pct = Math.min((meta.monto_actual / meta.monto_objetivo) * 100, 100);
  const completada = meta.monto_actual >= meta.monto_objetivo;

  let diasRestantes: number | null = null;
  let porMes: number | null = null;

  if (meta.fecha_limite) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(meta.fecha_limite + "T12:00:00");
    diasRestantes = Math.ceil((limite.getTime() - hoy.getTime()) / 86400000);

    if (diasRestantes > 0 && restante > 0) {
      const mesesRestantes = Math.max(diasRestantes / 30, 0.5);
      porMes = restante / mesesRestantes;
    }
  }

  const urgente = !completada && diasRestantes !== null && diasRestantes <= 30 && diasRestantes > 0;

  return { restante, pct, completada, diasRestantes, porMes, urgente };
}

export async function obtenerMetas(): Promise<Meta[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("metas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    ...m,
    monto_objetivo: Number(m.monto_objetivo),
    monto_actual: Number(m.monto_actual),
  }));
}

export async function crearMeta(
  datos: Omit<Meta, "id" | "usuario_id" | "created_at">
): Promise<Meta> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("metas")
    .insert({ ...datos, usuario_id: user?.id })
    .select()
    .single();
  if (error) throw error;
  return { ...data, monto_objetivo: Number(data.monto_objetivo), monto_actual: Number(data.monto_actual) };
}

export async function abonarMeta(id: string, montoAbonar: number): Promise<void> {
  const supabase = createClient();
  // Fetch current, then update — avoids race conditions vs RPC
  const { data, error: fetchError } = await supabase
    .from("metas")
    .select("monto_actual, monto_objetivo")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;

  const nuevoMonto = Math.min(
    Number(data.monto_actual) + montoAbonar,
    Number(data.monto_objetivo)
  );

  const { error } = await supabase
    .from("metas")
    .update({ monto_actual: nuevoMonto })
    .eq("id", id);
  if (error) throw error;
}

export async function eliminarMeta(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("metas").delete().eq("id", id);
  if (error) throw error;
}
