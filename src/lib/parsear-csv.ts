// Parser flexible para estados de cuenta de bancos mexicanos
// Detecta automáticamente las columnas de: fecha, descripción, cargo, abono

export interface FilaParseada {
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: "ingreso" | "gasto";
  categoria: string;
}

// Palabras clave para detectar columnas
const CLAVES_FECHA = ["fecha", "date", "día", "dia"];
const CLAVES_DESCRIPCION = ["descripcion", "descripción", "concepto", "comercio", "referencia", "detalle", "movimiento"];
const CLAVES_CARGO = ["cargo", "retiro", "retiros", "débito", "debito", "egreso", "gasto", "cargo(-)"];
const CLAVES_ABONO = ["abono", "depósito", "deposito", "crédito", "credito", "ingreso", "abono(+)"];
const CLAVES_MONTO = ["monto", "importe", "cantidad", "amount"];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function incluye(haystack: string, claves: string[]): boolean {
  const norm = normalizar(haystack);
  return claves.some((c) => norm.includes(c));
}

function parsearMonto(valor: string): number {
  if (!valor || valor.trim() === "" || valor.trim() === "-") return 0;
  // Eliminar símbolos de moneda, espacios y comillas
  const limpio = valor.replace(/[$,\s"']/g, "").replace(/\((.+)\)/, "-$1");
  return Math.abs(parseFloat(limpio) || 0);
}

function parsearFecha(valor: string): string {
  if (!valor) return new Date().toISOString().split("T")[0];

  // Formatos comunes: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY
  const limpio = valor.trim().replace(/['"]/g, "");

  // YYYY-MM-DD (ya está en formato correcto)
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpio)) return limpio;

  // DD/MM/YYYY o DD-MM-YYYY
  const partes = limpio.split(/[\/\-\.]/);
  if (partes.length === 3) {
    const [a, b, c] = partes;
    // Si primer segmento tiene 4 dígitos → YYYY/MM/DD
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
    // Si tercer segmento tiene 4 dígitos → DD/MM/YYYY
    if (c.length === 4) return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }

  return limpio;
}

function inferirCategoria(descripcion: string): string {
  const desc = normalizar(descripcion);
  if (/super|walmart|soriana|chedraui|costco|oxxo|7[- ]?eleven|mercado|tienda/.test(desc)) return "Alimentación";
  if (/uber|didi|taxi|gasolina|pemex|shell|bp|estacion/.test(desc)) return "Transporte";
  if (/netflix|spotify|amazon|disney|hbo|apple|google/.test(desc)) return "Entretenimiento";
  if (/farmacia|doctor|hospital|medic|salud/.test(desc)) return "Salud";
  if (/restaurante|restaurant|burger|pizza|sushi|cafe|coffee/.test(desc)) return "Alimentación";
  if (/renta|hipoteca|predial|cfe|telmex|izzi|totalplay/.test(desc)) return "Vivienda";
  if (/nomina|nómina|salario|sueldo|pago de/.test(desc)) return "Salario";
  return "Otros";
}

export function parsearCSV(contenido: string): FilaParseada[] {
  // Detectar separador: coma, punto y coma, o tabulación
  const primeraLinea = contenido.split("\n")[0];
  const separador = primeraLinea.includes(";")
    ? ";"
    : primeraLinea.includes("\t")
    ? "\t"
    : ",";

  const lineas = contenido
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length < 2) return [];

  // Parsear cabeceras
  const cabeceras = lineas[0].split(separador).map((h) => h.replace(/['"]/g, "").trim());

  // Detectar índices de columnas
  let idxFecha = -1;
  let idxDescripcion = -1;
  let idxCargo = -1;
  let idxAbono = -1;
  let idxMonto = -1;

  cabeceras.forEach((cab, i) => {
    if (idxFecha === -1 && incluye(cab, CLAVES_FECHA)) idxFecha = i;
    if (idxDescripcion === -1 && incluye(cab, CLAVES_DESCRIPCION)) idxDescripcion = i;
    if (idxCargo === -1 && incluye(cab, CLAVES_CARGO)) idxCargo = i;
    if (idxAbono === -1 && incluye(cab, CLAVES_ABONO)) idxAbono = i;
    if (idxMonto === -1 && incluye(cab, CLAVES_MONTO)) idxMonto = i;
  });

  const filas: FilaParseada[] = [];

  for (let i = 1; i < lineas.length; i++) {
    // Parsear respetando valores entre comillas
    const celdas = parsearCeldas(lineas[i], separador);
    if (celdas.length < 2) continue;

    const fecha = idxFecha >= 0 ? parsearFecha(celdas[idxFecha]) : new Date().toISOString().split("T")[0];
    const descripcion = idxDescripcion >= 0 ? celdas[idxDescripcion]?.replace(/['"]/g, "").trim() : "";

    let monto = 0;
    let tipo: "ingreso" | "gasto" = "gasto";

    if (idxCargo >= 0 && idxAbono >= 0) {
      // Dos columnas separadas: cargo y abono
      const cargo = parsearMonto(celdas[idxCargo]);
      const abono = parsearMonto(celdas[idxAbono]);
      if (abono > 0) {
        monto = abono;
        tipo = "ingreso";
      } else if (cargo > 0) {
        monto = cargo;
        tipo = "gasto";
      } else {
        continue;
      }
    } else if (idxMonto >= 0) {
      // Una sola columna de monto (negativo = gasto, positivo = ingreso)
      const raw = celdas[idxMonto]?.replace(/['"]/g, "").trim() ?? "";
      const valor = parseFloat(raw.replace(/[$,\s]/g, ""));
      if (isNaN(valor) || valor === 0) continue;
      monto = Math.abs(valor);
      tipo = valor < 0 ? "gasto" : "ingreso";
    } else {
      continue;
    }

    if (monto <= 0) continue;

    filas.push({
      fecha,
      descripcion,
      monto,
      tipo,
      categoria: inferirCategoria(descripcion),
    });
  }

  return filas;
}

function parsearCeldas(linea: string, sep: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let dentroComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const char = linea[i];
    if (char === '"') {
      dentroComillas = !dentroComillas;
    } else if (char === sep && !dentroComillas) {
      celdas.push(actual);
      actual = "";
    } else {
      actual += char;
    }
  }
  celdas.push(actual);
  return celdas;
}
