import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const PROMPT_EXTRACCION = `Eres un experto en leer estados de cuenta bancarios y de tarjetas de crédito mexicanas.
Tu tarea es extraer todas las transacciones REALES del estado de cuenta adjunto y categorizarlas inteligentemente.

━━━ PASO 1: IDENTIFICAR QUÉ TIPO DE ESTADO DE CUENTA ES ━━━
Determina si es:
A) Estado de cuenta de TARJETA DE CRÉDITO (Amex, BBVA Visa, etc.)
B) Estado de cuenta de CUENTA BANCARIA / DÉBITO

━━━ PASO 2: EXCLUIR ESTAS ENTRADAS (NO las registres) ━━━
Los siguientes movimientos NO son ingresos ni gastos reales — son transferencias internas entre cuentas propias o ajustes contables:
- "PAGO EN LINEA", "PAGO RECIBIDO", "PAGO DOMICILIADO", "PAGO TARJETA", "PAGO MINIMO", "LIQUIDACION TOTAL" → el usuario pagando su tarjeta de crédito. OMITIR.
- "SALDO ANTERIOR", "SALDO FINAL", "SALDO INICIAL" → datos de resumen. OMITIR.
- "BONIFICACION POR PAGO", "CASHBACK", ajustes de saldo → OMITIR si no son compras reales.
- Cuotas de apertura, intereses cobrados, comisiones bancarias → puedes incluirlas como gasto en "Servicios" si el monto es significativo.

━━━ PASO 3: REGLAS DE TIPO ━━━
Para las transacciones QUE SÍ registras:
- Si es tarjeta de crédito: CASI TODOS los movimientos son "gasto" (cargos/compras). Solo marca como "ingreso" si es una devolución/reembolso de una tienda (ej: "DEVOLUCION WALMART").
- Si es cuenta bancaria: DEPÓSITO / ABONO recibido de terceros → "ingreso". RETIRO / CARGO / transferencia saliente → "gasto".
- Nómina, sueldo, depósito de empresa → "ingreso".
- NUNCA marques como "ingreso" el pago que el usuario hizo a su propia tarjeta.

━━━ PASO 4: EXTRACCIÓN ━━━
- Extrae TODAS las filas de movimientos reales (aplicando las exclusiones anteriores)
- Fecha en formato YYYY-MM-DD
- El monto siempre es positivo (nunca negativo)
- Para la descripción: usa el CONCEPTO si existe, luego el nombre del comercio/beneficiario, luego el tipo de operación

━━━ PASO 5: CATEGORIZACIÓN ━━━
Analiza TODO el texto de la descripción para categorizar:
- RENTA, alquiler → Servicios
- ESTACIONAMIENTO, gasolina, UBER, DIDI, CABIFY, parking → Transporte
- WALMART, SORIANA, OXXO, CHEDRAUI, super, mercado → Supermercado
- NETFLIX, SPOTIFY, STEAM, juego, cine, bar, CINEPOLIS → Entretenimiento
- FARMACIA, doctor, médico, hospital, dentista, gym, SANA → Salud
- LUZ, CFE, TELMEX, TELCEL, IZZI, internet, agua, gas, seguro → Servicios
- AMERICAN EXPRESS, AMEX → Servicios (si es cargo por membresía o seguro, no pago de tarjeta)
- Transferencias a personas sin concepto claro → Otros
- Nómina, sueldo, pago de empresa → Otros (tipo ingreso)

Categorías disponibles (SOLO estas 10):
1. Comida (restaurantes, tacos, cafeterías, comida rápida)
2. Supermercado (walmart, soriana, chedraui, oxxo, abarrotes)
3. Transporte (uber, didi, gasolina, taxi, estacionamiento)
4. Entretenimiento (cine, spotify, netflix, steam, bares, salidas)
5. Salud (farmacia, médico, dentista, gimnasio)
6. Servicios (luz, agua, internet, teléfono, renta, domiciliaciones, seguros)
7. Ropa (ropa, zapatos, accesorios)
8. Hogar (muebles, limpieza, ferretería, decoración)
9. Educación (libros, cursos, colegiatura, escuela)
10. Otros (transferencias sin concepto identificable, retiros en efectivo)`;

const HERRAMIENTA_EXTRACCION: Anthropic.Tool = {
  name: "registrar_transacciones_estado_cuenta",
  description: "Registra todas las transacciones extraídas del estado de cuenta bancario",
  input_schema: {
    type: "object" as const,
    properties: {
      banco: {
        type: "string",
        description: "Nombre del banco (ej: Santander, BBVA, Banamex, Amex)",
      },
      periodo: {
        type: "string",
        description: "Periodo del estado de cuenta (ej: Diciembre 2025 - Enero 2026)",
      },
      transacciones: {
        type: "array",
        description: "Lista completa de todas las transacciones del estado de cuenta",
        items: {
          type: "object",
          properties: {
            fecha: {
              type: "string",
              description: "Fecha en formato YYYY-MM-DD",
            },
            descripcion: {
              type: "string",
              description: "Descripción del movimiento (comercio, concepto, beneficiario)",
            },
            monto: {
              type: "number",
              description: "Monto en pesos MXN, siempre positivo",
            },
            tipo: {
              type: "string",
              enum: ["gasto", "ingreso"],
              description: "gasto si es retiro/cargo/pago, ingreso si es depósito/abono",
            },
            categoria: {
              type: "string",
              description: "Una de las 10 categorías disponibles",
            },
          },
          required: ["fecha", "descripcion", "monto", "tipo", "categoria"],
        },
      },
    },
    required: ["transacciones", "banco", "periodo"],
  },
};

interface TransaccionExtraida {
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: "gasto" | "ingreso";
  categoria: string;
}

interface HerramientaInput {
  banco: string;
  periodo: string;
  transacciones: TransaccionExtraida[];
}

export async function POST(req: NextRequest) {
  try {
    // Verificar sesión
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("No autorizado", { status: 401 });

    const { pdfBase64 } = await req.json();
    if (!pdfBase64) return new Response("PDF requerido", { status: 400 });

    // Llamar a Claude con el PDF como documento
    const respuesta = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      tools: [HERRAMIENTA_EXTRACCION],
      tool_choice: { type: "any" },
      system: PROMPT_EXTRACCION,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            } as any,
            {
              type: "text",
              text: "Extrae todas las transacciones de este estado de cuenta y regístralas usando la herramienta disponible.",
            },
          ],
        },
      ],
    });

    // Extraer resultado de la herramienta
    const bloqueHerramienta = respuesta.content.find(
      (b) => b.type === "tool_use"
    ) as Anthropic.ToolUseBlock | undefined;

    if (!bloqueHerramienta) {
      return Response.json({ error: "Claude no pudo extraer transacciones del PDF" }, { status: 422 });
    }

    const datos = bloqueHerramienta.input as HerramientaInput;

    return Response.json({
      banco: datos.banco,
      periodo: datos.periodo,
      transacciones: datos.transacciones,
      total: datos.transacciones.length,
    });
  } catch (error) {
    console.error("Error al parsear PDF:", error);
    return new Response("Error al procesar el PDF", { status: 500 });
  }
}
