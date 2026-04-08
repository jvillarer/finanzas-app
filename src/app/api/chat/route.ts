import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const PROMPT_SISTEMA = `Eres un asistente experto en finanzas personales en México.
Tu nombre es "Finanzas IA" y respondes siempre en español.

Tu rol es ayudar al usuario a:
- Analizar sus ingresos y gastos
- Identificar patrones de gasto
- Sugerir formas de ahorrar dinero
- Responder preguntas sobre sus transacciones
- Dar consejos financieros personalizados
- Registrar nuevas transacciones cuando el usuario mencione un gasto o ingreso

IMPORTANTE: Cuando el usuario mencione que gastó o recibió dinero (ej: "gasté $500 en comida", "me pagaron $10,000", "compré gasolina por $800"),
SIEMPRE usa la herramienta crear_transaccion para registrarlo automáticamente. No preguntes confirmación, registralo y luego confirma al usuario.

Categorías disponibles: Comida, Transporte, Supermercado, Entretenimiento, Salud, Servicios, Ropa, Educación, Gasolina, Restaurantes, Otros

Sé conciso, claro y amigable. Usa pesos mexicanos (MXN) como moneda.`;

// Herramienta para crear transacciones
const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "crear_transaccion",
    description:
      "Registra una nueva transacción (gasto o ingreso) en el historial financiero del usuario. Úsala cuando el usuario mencione que gastó, pagó, compró, recibió dinero, le depositaron, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        monto: {
          type: "number",
          description: "Monto de la transacción en pesos MXN (número positivo)",
        },
        descripcion: {
          type: "string",
          description: "Descripción breve del gasto o ingreso",
        },
        categoria: {
          type: "string",
          description:
            "Categoría del gasto: Comida, Transporte, Supermercado, Entretenimiento, Salud, Servicios, Ropa, Educación, Gasolina, Restaurantes, Otros",
        },
        tipo: {
          type: "string",
          enum: ["gasto", "ingreso"],
          description: "Tipo: 'gasto' si el usuario pagó/gastó, 'ingreso' si recibió dinero",
        },
        fecha: {
          type: "string",
          description:
            "Fecha en formato YYYY-MM-DD. Si no se especifica, usar la fecha de hoy.",
        },
      },
      required: ["monto", "tipo", "categoria"],
    },
  },
];

interface TransaccionInput {
  monto: number;
  descripcion?: string;
  categoria: string;
  tipo: "gasto" | "ingreso";
  fecha?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verificar sesión activa
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    const { mensajes, incluirContexto } = await req.json();

    // Obtener transacciones recientes como contexto
    let contextoTransacciones = "";
    if (incluirContexto) {
      const { data: transacciones } = await supabase
        .from("transacciones")
        .select("monto, descripcion, categoria, tipo, fecha")
        .order("fecha", { ascending: false })
        .limit(50);

      if (transacciones && transacciones.length > 0) {
        const resumen = construirResumen(transacciones);
        contextoTransacciones = `\n\n--- DATOS FINANCIEROS DEL USUARIO ---\n${resumen}\n---`;
      }
    }

    // Fecha de hoy para contexto del modelo
    const hoy = new Date().toISOString().split("T")[0];
    const sistemaFinal =
      PROMPT_SISTEMA +
      contextoTransacciones +
      `\n\nFecha de hoy: ${hoy}`;

    // Primera llamada a Claude con herramientas
    const respuesta = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: sistemaFinal,
      tools: HERRAMIENTAS,
      messages: mensajes,
    });

    let textoFinal = "";
    let transaccionCreada = null;

    // Verificar si Claude quiere usar una herramienta
    if (respuesta.stop_reason === "tool_use") {
      const bloqueHerramienta = respuesta.content.find(
        (b) => b.type === "tool_use"
      ) as Anthropic.ToolUseBlock | undefined;

      if (bloqueHerramienta && bloqueHerramienta.name === "crear_transaccion") {
        const datos = bloqueHerramienta.input as TransaccionInput;

        // Guardar transacción en Supabase
        const fechaTransaccion = datos.fecha || hoy;
        const { data: nuevaTransaccion, error: errorInsert } = await supabase
          .from("transacciones")
          .insert({
            usuario_id: user.id,
            monto: datos.monto,
            descripcion: datos.descripcion || datos.categoria,
            categoria: datos.categoria,
            tipo: datos.tipo,
            fecha: fechaTransaccion,
          })
          .select()
          .single();

        const resultadoHerramienta = errorInsert
          ? `Error al guardar: ${errorInsert.message}`
          : `Transacción guardada exitosamente con ID ${nuevaTransaccion?.id}`;

        if (!errorInsert) {
          transaccionCreada = {
            monto: datos.monto,
            descripcion: datos.descripcion || datos.categoria,
            categoria: datos.categoria,
            tipo: datos.tipo,
            fecha: fechaTransaccion,
          };
        }

        // Segunda llamada a Claude con el resultado de la herramienta
        const respuestaFinal = await anthropic.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 512,
          system: sistemaFinal,
          tools: HERRAMIENTAS,
          messages: [
            ...mensajes,
            { role: "assistant", content: respuesta.content },
            {
              role: "user",
              content: [
                {
                  type: "tool_result",
                  tool_use_id: bloqueHerramienta.id,
                  content: resultadoHerramienta,
                },
              ],
            },
          ],
        });

        textoFinal =
          (
            respuestaFinal.content.find(
              (b) => b.type === "text"
            ) as Anthropic.TextBlock | undefined
          )?.text || "Transacción registrada.";
      }
    } else {
      // Respuesta de texto normal
      textoFinal =
        (
          respuesta.content.find(
            (b) => b.type === "text"
          ) as Anthropic.TextBlock | undefined
        )?.text || "";
    }

    return Response.json({ texto: textoFinal, transaccionCreada });
  } catch (error) {
    console.error("Error en chat:", error);
    return new Response("Error al procesar el mensaje", { status: 500 });
  }
}

interface Transaccion {
  monto: number;
  descripcion: string;
  categoria: string;
  tipo: "ingreso" | "gasto";
  fecha: string;
}

function construirResumen(transacciones: Transaccion[]): string {
  const ingresos = transacciones
    .filter((t) => t.tipo === "ingreso")
    .reduce((s, t) => s + Number(t.monto), 0);
  const gastos = transacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((s, t) => s + Number(t.monto), 0);

  // Gastos por categoría
  const porCategoria: Record<string, number> = {};
  transacciones
    .filter((t) => t.tipo === "gasto")
    .forEach((t) => {
      const cat = t.categoria || "Otros";
      porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.monto);
    });

  const categorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, monto]) => `  - ${cat}: $${monto.toFixed(2)}`)
    .join("\n");

  const ultimas = transacciones
    .slice(0, 10)
    .map(
      (t) =>
        `  - [${t.fecha}] ${t.tipo === "ingreso" ? "+" : "-"}$${Number(t.monto).toFixed(2)} | ${t.descripcion || t.categoria}`
    )
    .join("\n");

  return `Resumen (últimas ${transacciones.length} transacciones):
Total ingresos: $${ingresos.toFixed(2)} MXN
Total gastos: $${gastos.toFixed(2)} MXN
Balance: $${(ingresos - gastos).toFixed(2)} MXN

Gastos por categoría:
${categorias || "  Sin categorías"}

Últimas transacciones:
${ultimas}`;
}
