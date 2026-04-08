import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const PROMPT_EXTRACCION = `Eres un experto en leer estados de cuenta bancarios mexicanos.
Tu tarea es extraer TODAS las transacciones del estado de cuenta adjunto.

Reglas:
- DEPOSITO / ABONO / CRÉDITO → tipo "ingreso"
- RETIRO / CARGO / DÉBITO / PAGO → tipo "gasto"
- Extrae TODAS las filas de movimientos, sin omitir ninguna
- Usa la fecha exacta que aparece en el documento (formato YYYY-MM-DD)
- El monto siempre es positivo, el tipo determina si es ingreso o gasto
- Para la descripción usa el texto descriptivo del movimiento (no el folio/número)
- Si hay CONCEPTO en la descripción, inclúyelo pues ayuda a categorizar

Categorías disponibles (SOLO estas 10):
1. Comida (restaurantes, tacos, cafeterías, comida rápida)
2. Supermercado (walmart, soriana, chedraui, abarrotes)
3. Transporte (uber, didi, gasolina, taxi, estacionamiento)
4. Entretenimiento (cine, spotify, netflix, bares, salidas)
5. Salud (farmacia, médico, dentista, gimnasio)
6. Servicios (luz, agua, internet, teléfono, renta, domiciliaciones, american express)
7. Ropa (ropa, zapatos, accesorios)
8. Hogar (muebles, limpieza, ferretería, decoración)
9. Educación (libros, cursos, colegiatura, escuela)
10. Otros (transferencias sin concepto claro, retiros en efectivo, etc.)`;

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
      model: "claude-opus-4-6",
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
            } as Anthropic.RequestDocumentBlock,
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
