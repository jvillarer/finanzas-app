// ─────────────────────────────────────────────────────────────────────────────
// Calculadora de ISR y deducciones personales — SAT México 2024
// Artículo 152 LISR (tablas anuales)
// ─────────────────────────────────────────────────────────────────────────────

// Tabla ISR anual 2024 (artículo 152 LISR)
const TABLA_ISR_2024 = [
  { limInf: 0.01,          limSup: 8_952.49,       cuotaFija: 0.00,          tasaExc: 0.0192 },
  { limInf: 8_952.50,      limSup: 75_984.55,      cuotaFija: 171.88,        tasaExc: 0.0640 },
  { limInf: 75_984.56,     limSup: 133_536.07,     cuotaFija: 4_461.94,      tasaExc: 0.1088 },
  { limInf: 133_536.08,    limSup: 155_229.80,     cuotaFija: 10_723.55,     tasaExc: 0.1600 },
  { limInf: 155_229.81,    limSup: 185_852.57,     cuotaFija: 14_194.54,     tasaExc: 0.1792 },
  { limInf: 185_852.58,    limSup: 374_837.88,     cuotaFija: 19_682.13,     tasaExc: 0.2136 },
  { limInf: 374_837.89,    limSup: 590_795.99,     cuotaFija: 60_049.40,     tasaExc: 0.2352 },
  { limInf: 590_796.00,    limSup: 1_127_926.84,   cuotaFija: 110_842.74,    tasaExc: 0.3000 },
  { limInf: 1_127_926.85,  limSup: 1_503_902.46,   cuotaFija: 271_981.99,    tasaExc: 0.3200 },
  { limInf: 1_503_902.47,  limSup: 4_511_707.37,   cuotaFija: 392_294.17,    tasaExc: 0.3400 },
  { limInf: 4_511_707.38,  limSup: Infinity,        cuotaFija: 1_414_947.85,  tasaExc: 0.3500 },
];

// Límites de deducción de colegiaturas 2024 (Art. 151 LISR)
export const LIMITES_COLEGIATURA: Record<string, number> = {
  preescolar:           14_200,
  primaria:             12_900,
  secundaria:           19_900,
  "profesional técnico": 17_100,
  bachillerato:         24_500,
};

// Calcula el ISR anual para un ingreso acumulable dado
export function calcularISR(ingresoAnual: number): number {
  if (ingresoAnual <= 0) return 0;

  const tramo = TABLA_ISR_2024.find(
    (t) => ingresoAnual >= t.limInf && ingresoAnual <= t.limSup
  ) ?? TABLA_ISR_2024[TABLA_ISR_2024.length - 1];

  return tramo.cuotaFija + (ingresoAnual - tramo.limInf) * tramo.tasaExc;
}

// Devuelve la tasa marginal que aplica al ingreso (para mostrar al usuario)
export function tasaMarginal(ingresoAnual: number): number {
  if (ingresoAnual <= 0) return 0;
  const tramo = TABLA_ISR_2024.find(
    (t) => ingresoAnual >= t.limInf && ingresoAnual <= t.limSup
  ) ?? TABLA_ISR_2024[TABLA_ISR_2024.length - 1];
  return tramo.tasaExc;
}

export interface ResultadoISR {
  ingresoAnual: number;
  totalDeducible: number;
  baseGravableSin: number;      // ingreso sin deducciones
  baseGravableCon: number;      // ingreso - deducciones
  isrSinDeducciones: number;
  isrConDeducciones: number;
  devolucionEstimada: number;   // diferencia (ahorro fiscal)
  tasaMarginalPct: number;      // tasa del tramo en %
}

// Calcula el impacto fiscal de las deducciones
export function calcularDevolucion(
  ingresoAnual: number,
  totalDeducible: number
): ResultadoISR {
  // Las deducciones personales tienen tope: el mayor de 15% del ingreso o 5 UMAs anuales (~$58,835 en 2024)
  const UMA_ANUAL_2024 = 58_835;
  const topeDeduccion = Math.max(ingresoAnual * 0.15, UMA_ANUAL_2024);
  const deduccionEfectiva = Math.min(totalDeducible, topeDeduccion);

  const baseGravableSin = ingresoAnual;
  const baseGravableCon = Math.max(0, ingresoAnual - deduccionEfectiva);

  const isrSinDeducciones = calcularISR(baseGravableSin);
  const isrConDeducciones = calcularISR(baseGravableCon);
  const devolucionEstimada = Math.max(0, isrSinDeducciones - isrConDeducciones);

  return {
    ingresoAnual,
    totalDeducible: deduccionEfectiva,
    baseGravableSin,
    baseGravableCon,
    isrSinDeducciones,
    isrConDeducciones,
    devolucionEstimada,
    tasaMarginalPct: tasaMarginal(ingresoAnual) * 100,
  };
}

// ── Clasificación de transacciones deducibles ─────────────────────────────────

export type TipoDeduccion =
  | "gastos_medicos"
  | "colegiatura"
  | "seguro_gm"
  | "hipoteca"
  | "donativo"
  | null;

// Solo keywords específicos de GMM — "seguro" solo no alcanza
// (evita capturar seguro de carro, seguro de vida, seguro de robo, etc.)
const KEYWORDS_SEGURO_GM = [
  "gmm", "gastos medicos", "gastos médicos",
  "seguro médico", "seguro medico",
  "seguro de gastos", "seguros de salud", "seguro de salud",
];

// Solo keywords que confirman hipoteca — "intereses" solo no alcanza
// (evita capturar intereses MSI, intereses de banco, etc.)
const KEYWORDS_HIPOTECA = [
  "hipoteca", "credito hipotecario", "crédito hipotecario",
  "infonavit", "fovissste", "prestamo hipotecario", "préstamo hipotecario",
  "intereses hipotecarios", "intereses de hipoteca",
];

const KEYWORDS_DONATIVO = [
  "donativo", "donación", "donacion", "cruz roja", "unicef",
  "caridad", "fundacion", "fundación", "teletón", "telethon",
];

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function clasificarDeduccion(
  categoria: string,
  descripcion: string
): TipoDeduccion {
  const desc = normalizar(descripcion || "");

  if (categoria === "Salud") return "gastos_medicos";
  if (categoria === "Educación") return "colegiatura";

  if (categoria === "Servicios") {
    if (KEYWORDS_SEGURO_GM.some((k) => desc.includes(normalizar(k)))) return "seguro_gm";
    if (KEYWORDS_HIPOTECA.some((k) => desc.includes(normalizar(k)))) return "hipoteca";
  }

  if (KEYWORDS_DONATIVO.some((k) => desc.includes(normalizar(k)))) return "donativo";

  return null;
}

export const ETIQUETAS_DEDUCCION: Record<NonNullable<TipoDeduccion>, string> = {
  gastos_medicos: "Gastos médicos",
  colegiatura:    "Colegiaturas",
  seguro_gm:      "Seguro de gastos médicos",
  hipoteca:       "Intereses hipotecarios",
  donativo:       "Donativos",
};

export const EMOJIS_DEDUCCION: Record<NonNullable<TipoDeduccion>, string> = {
  gastos_medicos: "🏥",
  colegiatura:    "🎓",
  seguro_gm:      "🛡️",
  hipoteca:       "🏠",
  donativo:       "💝",
};

// ── Detección de nivel educativo para calcular tope de colegiatura ────────────

export type NivelColegiatura =
  | "preescolar"
  | "primaria"
  | "secundaria"
  | "profesional técnico"
  | "bachillerato"
  | null;

const KEYWORDS_NIVEL: { nivel: NonNullable<NivelColegiatura>; palabras: string[] }[] = [
  { nivel: "preescolar",        palabras: ["preescolar", "kinder", "guarderia", "jardin", "maternal", "cendi"] },
  { nivel: "primaria",          palabras: ["primaria", "elementary"] },
  { nivel: "secundaria",        palabras: ["secundaria", "telesecundaria", "middle school", "secundario"] },
  { nivel: "profesional técnico", palabras: ["conalep", "cetis", "cbtis", "cecyt", "vocacional", "profesional tecnico", "profesional técnico"] },
  { nivel: "bachillerato",      palabras: ["prepa", "preparatoria", "bachillerato", "cch", "bachiller", "cobach", "cecyte", "high school", "telebachillerato"] },
];

export function detectarNivelColegiatura(descripcion: string): NivelColegiatura {
  const desc = normalizar(descripcion || "");
  for (const { nivel, palabras } of KEYWORDS_NIVEL) {
    if (palabras.some((p) => desc.includes(normalizar(p)))) return nivel;
  }
  return null;
}

// Devuelve el tope anual de colegiatura para un nivel dado
export function topeColegiatura(nivel: NonNullable<NivelColegiatura>): number {
  return LIMITES_COLEGIATURA[nivel] ?? 0;
}
