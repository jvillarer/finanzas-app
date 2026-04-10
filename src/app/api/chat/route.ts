import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const PROMPT_SISTEMA = `Eres Lani 🐑, una borrega inteligente y simpática experta en finanzas personales.
Tu nombre es Lani. Hablas en español mexicano casual, eres directa y amigable.
NUNCA menciones que eres una IA, Claude, o cualquier software. Eres simplemente Lani.

Tu rol es ayudar al usuario a:
- Analizar sus ingresos y gastos
- Identificar patrones de gasto
- Sugerir formas de ahorrar dinero
- Responder preguntas sobre sus transacciones
- Dar consejos financieros personalizados
- Registrar nuevas transacciones cuando el usuario mencione un gasto o ingreso
- Analizar fotos de tickets/recibos y registrar cada producto automáticamente

REGLAS IMPORTANTES:
1. Cuando el usuario mencione que gastó o recibió dinero (ej: "gasté $500 en comida", "me pagaron $10,000"),
   usa crear_transaccion para registrarlo.
2. Cuando el usuario mande una foto de un ticket o recibo de compra,
   usa crear_multiples_transacciones para registrar CADA artículo del ticket por separado.
   Reglas para tickets:
   - Registra todos los artículos que puedas leer con claridad
   - Si el nombre está cortado pero el precio es legible: regístralo con el nombre parcial y categoría "Otros"
   - Si la categoría no es clara: usa "Otros" como fallback
   - NUNCA inventes montos — si el precio de un artículo es ilegible, NO lo registres
   - Siempre busca el TOTAL del ticket (normalmente al final del recibo). Úsalo como referencia.
   - Después de registrar lo que puedas, muestra: "Registré $X de $TOTAL del ticket."
   - Si hay diferencia, lista los artículos ilegibles y pregunta de forma directa e informal:
     "Oye, me faltan $DIFERENCIA para cuadrar el ticket. Estos no les pude leer el precio: [X] y [Y] — ¿cuánto costó cada uno?"
   - El objetivo es que la suma de todas las transacciones registradas iguale exactamente el total del ticket.
3. Nunca pidas confirmación antes de registrar — registra y luego confirma al usuario.
4. Si el usuario pide MODIFICAR, CORREGIR o CAMBIAR una transacción existente
   (ej: "eso no fue el 27 sino el 30", "ese gasto era de 500 no de 300", "cámbiala a transporte"),
   usa actualizar_transaccion con el ID correcto del contexto. NUNCA crees una nueva.
5. Si el usuario pide BORRAR o ELIMINAR una transacción, usa eliminar_transaccion con su ID.
   Hazlo directo sin pedir confirmación, solo avisa que la borraste.

Categorías disponibles (SOLO estas 10, no uses ninguna otra):
1. Comida (restaurantes, tacos, cafeterías, comida rápida)
2. Supermercado (walmart, soriana, chedraui, abarrotes)
3. Transporte (uber, didi, gasolina, taxi, estacionamiento)
4. Entretenimiento (cine, spotify, netflix, bares, salidas)
5. Salud (farmacia, médico, dentista, gimnasio)
6. Servicios (luz, agua, internet, teléfono, streaming)
7. Ropa (ropa, zapatos, accesorios)
8. Hogar (muebles, limpieza, ferretería, decoración)
9. Educación (libros, cursos, colegiatura, escuela)
10. Otros (cualquier cosa que no encaje en las anteriores)

Sé conciso, claro y amigable. Usa pesos mexicanos (MXN) como moneda.`;

// Herramientas disponibles para Claude
const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "crear_transaccion",
    description:
      "Registra una sola transacción (gasto o ingreso). Úsala cuando el usuario mencione un gasto o ingreso específico en texto.",
    input_schema: {
      type: "object" as const,
      properties: {
        monto: { type: "number", description: "Monto en pesos MXN (positivo)" },
        descripcion: { type: "string", description: "Descripción breve" },
        categoria: { type: "string", description: "Categoría del gasto" },
        tipo: { type: "string", enum: ["gasto", "ingreso"] },
        fecha: { type: "string", description: "Fecha YYYY-MM-DD, hoy si no se especifica" },
      },
      required: ["monto", "tipo", "categoria"],
    },
  },
  {
    name: "crear_multiples_transacciones",
    description:
      "Registra múltiples transacciones de una sola vez. Úsala cuando el usuario mande foto de un ticket/recibo o mencione varios gastos juntos. Agrupa productos similares por categoría si son muy pequeños.",
    input_schema: {
      type: "object" as const,
      properties: {
        transacciones: {
          type: "array",
          description: "Lista de transacciones a registrar",
          items: {
            type: "object",
            properties: {
              monto: { type: "number", description: "Monto en pesos MXN" },
              descripcion: { type: "string", description: "Nombre del producto o descripción" },
              categoria: { type: "string", description: "Categoría" },
              tipo: { type: "string", enum: ["gasto", "ingreso"] },
              fecha: { type: "string", description: "Fecha YYYY-MM-DD" },
            },
            required: ["monto", "tipo", "categoria", "descripcion"],
          },
        },
        resumen: {
          type: "string",
          description: "Nombre del establecimiento o descripción general del ticket (ej: 'Walmart Monterrey')",
        },
      },
      required: ["transacciones"],
    },
  },
  {
    name: "actualizar_transaccion",
    description: "Actualiza una transacción existente. Úsala cuando el usuario pida corregir fecha, monto, categoría, descripción o tipo de un movimiento ya registrado. Usa el ID que aparece en el contexto.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "ID de la transacción a actualizar (del contexto)" },
        fecha: { type: "string", description: "Nueva fecha YYYY-MM-DD (si cambia)" },
        monto: { type: "number", description: "Nuevo monto (si cambia)" },
        descripcion: { type: "string", description: "Nueva descripción (si cambia)" },
        categoria: { type: "string", description: "Nueva categoría (si cambia)" },
        tipo: { type: "string", enum: ["gasto", "ingreso"], description: "Nuevo tipo (si cambia)" },
      },
      required: ["id"],
    },
  },
  {
    name: "eliminar_transaccion",
    description: "Elimina una transacción existente. Úsala cuando el usuario pida borrar o eliminar un movimiento. Usa el ID que aparece en el contexto.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "ID de la transacción a eliminar (del contexto)" },
      },
      required: ["id"],
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

interface MultipleTransaccionesInput {
  transacciones: TransaccionInput[];
  resumen?: string;
}

interface ImagenRequest {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("No autorizado", { status: 401 });

    const { mensajes, incluirContexto, imagen } = await req.json() as {
      mensajes: { role: string; content: string }[];
      incluirContexto: boolean;
      imagen?: ImagenRequest;
    };

    // Contexto de transacciones recientes (incluye IDs para editar/eliminar)
    let contextoTransacciones = "";
    if (incluirContexto) {
      const { data: transacciones } = await supabase
        .from("transacciones")
        .select("id, monto, descripcion, categoria, tipo, fecha")
        .order("fecha", { ascending: false })
        .limit(50);

      if (transacciones && transacciones.length > 0) {
        contextoTransacciones = `\n\n--- DATOS FINANCIEROS DEL USUARIO ---\n${construirResumen(transacciones)}\n---`;
      }
    }

    const hoy = new Date().toISOString().split("T")[0];
    const sistemaFinal = PROMPT_SISTEMA + contextoTransacciones + `\n\nFecha de hoy: ${hoy}`;

    // Construir mensajes para la API — si hay imagen, el último mensaje la incluye
    type MensajeAPI = { role: string; content: string | Anthropic.ContentBlockParam[] };
    const mensajesAPI: MensajeAPI[] = [...mensajes];

    if (imagen && mensajesAPI.length > 0) {
      const ultimoMensaje = mensajesAPI[mensajesAPI.length - 1];
      mensajesAPI[mensajesAPI.length - 1] = {
        role: ultimoMensaje.role,
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: imagen.mediaType,
              data: imagen.base64,
            },
          },
          {
            type: "text",
            text: (typeof ultimoMensaje.content === "string" ? ultimoMensaje.content : "") || "Analiza este ticket y registra cada producto",
          },
        ],
      };
    }

    // Primera llamada a Claude
    const respuesta = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: sistemaFinal,
      tools: HERRAMIENTAS,
      messages: mensajesAPI as Anthropic.MessageParam[],
    });

    let textoFinal = "";
    let transaccionesCreadas: TransaccionInput[] = [];

    if (respuesta.stop_reason === "tool_use") {
      const bloqueHerramienta = respuesta.content.find(
        (b) => b.type === "tool_use"
      ) as Anthropic.ToolUseBlock | undefined;

      if (!bloqueHerramienta) {
        textoFinal = "No pude procesar la solicitud.";
      } else if (bloqueHerramienta.name === "crear_transaccion") {
        // --- Transacción individual ---
        const datos = bloqueHerramienta.input as TransaccionInput;
        const fecha = datos.fecha || hoy;

        const { error } = await supabase.from("transacciones").insert({
          usuario_id: user.id,
          monto: datos.monto,
          descripcion: datos.descripcion || datos.categoria,
          categoria: datos.categoria,
          tipo: datos.tipo,
          fecha,
        });

        if (!error) {
          transaccionesCreadas = [{ ...datos, fecha }];
        }

        const resultado = error ? `Error: ${error.message}` : "Transacción guardada correctamente.";
        textoFinal = await llamarClaudeConResultado(
          anthropic, sistemaFinal, HERRAMIENTAS, mensajesAPI as Anthropic.MessageParam[],
          respuesta.content, bloqueHerramienta.id, resultado
        );

      } else if (bloqueHerramienta.name === "actualizar_transaccion") {
        // --- Actualizar transacción existente ---
        const datos = bloqueHerramienta.input as {
          id: string; fecha?: string; monto?: number;
          descripcion?: string; categoria?: string; tipo?: string;
        };
        const cambios: Record<string, unknown> = {};
        if (datos.fecha) cambios.fecha = datos.fecha;
        if (datos.monto) cambios.monto = datos.monto;
        if (datos.descripcion) cambios.descripcion = datos.descripcion;
        if (datos.categoria) cambios.categoria = datos.categoria;
        if (datos.tipo) cambios.tipo = datos.tipo;

        const { error } = await supabase
          .from("transacciones").update(cambios).eq("id", datos.id).eq("usuario_id", user.id);

        const resultado = error ? `Error: ${error.message}` : "Transacción actualizada correctamente.";
        textoFinal = await llamarClaudeConResultado(
          anthropic, sistemaFinal, HERRAMIENTAS, mensajesAPI as Anthropic.MessageParam[],
          respuesta.content, bloqueHerramienta.id, resultado
        );

      } else if (bloqueHerramienta.name === "eliminar_transaccion") {
        // --- Eliminar transacción existente ---
        const datos = bloqueHerramienta.input as { id: string };
        const { error } = await supabase
          .from("transacciones").delete().eq("id", datos.id).eq("usuario_id", user.id);

        const resultado = error ? `Error: ${error.message}` : "Transacción eliminada correctamente.";
        textoFinal = await llamarClaudeConResultado(
          anthropic, sistemaFinal, HERRAMIENTAS, mensajesAPI as Anthropic.MessageParam[],
          respuesta.content, bloqueHerramienta.id, resultado
        );

      } else if (bloqueHerramienta.name === "crear_multiples_transacciones") {
        // --- Múltiples transacciones (ticket) ---
        const datos = bloqueHerramienta.input as MultipleTransaccionesInput;
        const filas = datos.transacciones.map((t) => ({
          usuario_id: user.id,
          monto: t.monto,
          descripcion: t.descripcion || t.categoria,
          categoria: t.categoria,
          tipo: t.tipo,
          fecha: t.fecha || hoy,
        }));

        const { error } = await supabase.from("transacciones").insert(filas);

        if (!error) {
          transaccionesCreadas = datos.transacciones.map((t) => ({
            ...t,
            fecha: t.fecha || hoy,
          }));
        }

        const total = filas.reduce((s, t) => s + t.monto, 0);
        const resultado = error
          ? `Error: ${error.message}`
          : `${filas.length} transacciones guardadas. Total: $${total.toFixed(2)} MXN.`;

        textoFinal = await llamarClaudeConResultado(
          anthropic, sistemaFinal, HERRAMIENTAS, mensajesAPI as Anthropic.MessageParam[],
          respuesta.content, bloqueHerramienta.id, resultado
        );
      }
    } else {
      textoFinal = (respuesta.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text || "";
    }

    return Response.json({ texto: textoFinal, transaccionesCreadas });
  } catch (error) {
    console.error("Error en chat:", error);
    return new Response("Error al procesar el mensaje", { status: 500 });
  }
}

// Llama a Claude con el resultado de una herramienta y devuelve el texto final
async function llamarClaudeConResultado(
  anthropic: Anthropic,
  sistema: string,
  herramientas: Anthropic.Tool[],
  mensajesOriginales: Anthropic.MessageParam[],
  contenidoAsistente: Anthropic.ContentBlock[],
  toolUseId: string,
  resultado: string
): Promise<string> {
  const respuestaFinal = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: sistema,
    tools: herramientas,
    messages: [
      ...mensajesOriginales,
      { role: "assistant", content: contenidoAsistente },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUseId, content: resultado }],
      },
    ],
  });

  return (respuestaFinal.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text || "Listo.";
}

interface Transaccion {
  id: string;
  monto: number;
  descripcion: string;
  categoria: string;
  tipo: "ingreso" | "gasto";
  fecha: string;
}

function construirResumen(transacciones: Transaccion[]): string {
  const ingresos = transacciones.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
  const gastos = transacciones.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);

  const porCategoria: Record<string, number> = {};
  transacciones.filter((t) => t.tipo === "gasto").forEach((t) => {
    const cat = t.categoria || "Otros";
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.monto);
  });

  const categorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, monto]) => `  - ${cat}: $${monto.toFixed(2)}`)
    .join("\n");

  const ultimas = transacciones.slice(0, 50).map((t) =>
    `  - [ID:${t.id}] [${t.fecha}] ${t.tipo === "ingreso" ? "+" : "-"}$${Number(t.monto).toFixed(2)} | ${t.descripcion || t.categoria} | ${t.categoria}`
  ).join("\n");

  return `Resumen (últimas ${transacciones.length} transacciones):
Total ingresos: $${ingresos.toFixed(2)} MXN
Total gastos: $${gastos.toFixed(2)} MXN
Balance: $${(ingresos - gastos).toFixed(2)} MXN

Gastos por categoría:
${categorias || "  Sin categorías"}

Últimas transacciones:
${ultimas}`;
}
