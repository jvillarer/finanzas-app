import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Tipos de la base de datos
export type Transaccion = {
  id: string;
  usuario_id: string;
  monto: number;
  descripcion: string;
  categoria: string;
  tipo: "ingreso" | "gasto";
  fecha: string;
  creado_en: string;
};
