import { createClient, Transaccion } from "./supabase";

// Formateador en módulo para no crear instancias en cada llamada
const formateador = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export async function obtenerTransacciones(): Promise<Transaccion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transacciones")
    .select("id, monto, descripcion, categoria, tipo, fecha, usuario_id, creado_en")
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false }) // Dentro del mismo día, más reciente primero
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

export async function crearTransaccionesMSI(
  base: Omit<Transaccion, "id" | "usuario_id" | "creado_en">,
  meses: number
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const montoPorMes = Math.floor((base.monto / meses) * 100) / 100;
  const montoUltimo = Math.round((base.monto - montoPorMes * (meses - 1)) * 100) / 100;

  const [anio, mes, dia] = base.fecha.split("-").map(Number);

  const filas = Array.from({ length: meses }, (_, i) => {
    const d = new Date(anio, mes - 1 + i, dia);
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const monto = i === meses - 1 ? montoUltimo : montoPorMes;
    const desc = base.descripcion || base.categoria;
    return {
      ...base,
      monto,
      descripcion: `${desc} (${i + 1}/${meses})`,
      fecha,
      usuario_id: user?.id,
    };
  });

  const { error } = await supabase.from("transacciones").insert(filas);
  if (error) throw error;
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
