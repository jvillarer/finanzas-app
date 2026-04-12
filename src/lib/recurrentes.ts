import type { Transaccion } from "./supabase";

export interface PagoRecurrente {
  descripcion: string;
  montoPromedio: number;
  mesesDetectados: number;
  ultimaFecha: string;
}

function normalizarDesc(desc: string): string {
  return desc
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // quitar acentos
    .replace(/[^a-z0-9\s]/g, "")      // quitar caracteres especiales
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "de", "el", "la", "los", "las", "en", "a", "y", "o", "del",
  "por", "con", "para", "un", "una", "pago", "cargo", "mes",
]);

function palabrasSignificativas(desc: string): Set<string> {
  return new Set(
    desc.split(" ").filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

// Overlap coefficient: interseccion / min(|A|, |B|)
// Detecta cuando uno contiene al otro (ej. "Netflix" en "Pago Netflix mensual")
function similitudOverlap(a: string, b: string): number {
  const pa = palabrasSignificativas(a);
  const pb = palabrasSignificativas(b);
  if (pa.size === 0 && pb.size === 0) return 1;
  if (pa.size === 0 || pb.size === 0) return 0;
  const interseccion = Array.from(pa).filter((w) => pb.has(w)).length;
  return interseccion / Math.min(pa.size, pb.size);
}

export function detectarRecurrentes(transacciones: Transaccion[]): PagoRecurrente[] {
  const hoy = new Date();
  const hace6Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);

  const gastos = transacciones.filter((t) => {
    if (t.tipo !== "gasto") return false;
    if (!t.descripcion?.trim()) return false;
    const f = new Date(t.fecha + "T12:00:00");
    return f >= hace6Meses;
  });

  // Agrupar por descripción normalizada (exacto)
  const grupos: Record<string, Transaccion[]> = {};
  for (const t of gastos) {
    const key = normalizarDesc(t.descripcion);
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(t);
  }

  // Fusionar grupos similares con union-find
  const claves = Object.keys(grupos);
  const padre: number[] = claves.map((_, i) => i);

  function find(i: number): number {
    if (padre[i] !== i) padre[i] = find(padre[i]);
    return padre[i];
  }

  for (let i = 0; i < claves.length; i++) {
    for (let j = i + 1; j < claves.length; j++) {
      if (find(i) !== find(j) && similitudOverlap(claves[i], claves[j]) >= 0.6) {
        padre[find(j)] = find(i);
      }
    }
  }

  // Reagrupar por raíz
  const merged: Record<number, Transaccion[]> = {};
  for (let i = 0; i < claves.length; i++) {
    const root = find(i);
    if (!merged[root]) merged[root] = [];
    merged[root].push(...grupos[claves[i]]);
  }

  const resultado: PagoRecurrente[] = [];

  for (const txs of Object.values(merged)) {
    const mesesUnicos = new Set(txs.map((t) => t.fecha.slice(0, 7)));
    if (mesesUnicos.size < 2) continue;

    const montoPromedio = txs.reduce((s, t) => s + Number(t.monto), 0) / txs.length;
    const ordenadas = [...txs].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ultimaFecha = ordenadas[0].fecha;
    const descripcion = ordenadas[0].descripcion.trim();

    resultado.push({ descripcion, montoPromedio, mesesDetectados: mesesUnicos.size, ultimaFecha });
  }

  return resultado.sort((a, b) => b.montoPromedio - a.montoPromedio);
}

export function totalRecurrentes(recurrentes: PagoRecurrente[]): number {
  return recurrentes.reduce((s, r) => s + r.montoPromedio, 0);
}
