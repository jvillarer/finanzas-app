import { createClient, Transaccion } from "./supabase";

export async function obtenerTransacciones(): Promise<Transaccion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transacciones")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function crearTransaccion(
  transaccion: Omit<Transaccion, "id" | "usuario_id" | "creado_en">
): Promise<Transaccion> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("transacciones")
    .insert({ ...transaccion, usuario_id: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function calcularResumen(transacciones: Transaccion[]) {
  const ingresos = transacciones
    .filter((t) => t.tipo === "ingreso")
    .reduce((sum, t) => sum + Number(t.monto), 0);

  const gastos = transacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((sum, t) => sum + Number(t.monto), 0);

  return {
    ingresos,
    gastos,
    balance: ingresos - gastos,
  };
}

export function formatearMonto(monto: number): string {
  return "$" + new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}
