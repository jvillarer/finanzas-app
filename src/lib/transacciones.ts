import { createClient, Transaccion } from "./supabase";

// Formateador en módulo para no crear instancias en cada llamada
const formateador = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export async function obtenerTransacciones(): Promise<Transaccion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transacciones")
    .select("id, monto, descripcion, categoria, tipo, fecha, usuario_id, creado_en")
    .order("fecha", { ascending: false })
    .limit(500); // Evita cargar historiales masivos; 500 txs cubre ~2 años de uso activo

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
  return "$" + formateador.format(monto);
}
