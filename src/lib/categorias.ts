import { createClient } from "@/lib/supabase";

export interface CategoriaCustom {
  id: string;
  nombre: string;
  emoji: string;
}

export const CATEGORIAS_DEFAULT = [
  { nombre: "Comida",          emoji: "🍽" },
  { nombre: "Supermercado",    emoji: "🛒" },
  { nombre: "Transporte",      emoji: "🚗" },
  { nombre: "Entretenimiento", emoji: "🎬" },
  { nombre: "Salud",           emoji: "💊" },
  { nombre: "Servicios",       emoji: "⚡" },
  { nombre: "Ropa",            emoji: "👕" },
  { nombre: "Hogar",           emoji: "🏠" },
  { nombre: "Educación",       emoji: "📚" },
  { nombre: "Otros",           emoji: "📦" },
];

export async function obtenerCategoriasCustom(): Promise<CategoriaCustom[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categorias_custom")
    .select("id, nombre, emoji")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function crearCategoriaCustom(nombre: string, emoji: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("categorias_custom")
    .insert([{ nombre: nombre.trim(), emoji, usuario_id: user?.id }]);
  if (error) throw error;
}

export async function eliminarCategoriaCustom(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("categorias_custom")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Devuelve la lista completa: predefinidas + custom del usuario
export async function obtenerTodasLasCategorias(): Promise<{ nombre: string; emoji: string; esCustom?: boolean; id?: string }[]> {
  const custom = await obtenerCategoriasCustom();
  const nombresDefault = new Set(CATEGORIAS_DEFAULT.map((c) => c.nombre));
  const soloCustom = custom.filter((c) => !nombresDefault.has(c.nombre));
  return [
    ...CATEGORIAS_DEFAULT,
    ...soloCustom.map((c) => ({ nombre: c.nombre, emoji: c.emoji, esCustom: true, id: c.id })),
  ];
}
