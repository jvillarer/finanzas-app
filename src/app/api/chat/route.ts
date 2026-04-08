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

Cuando el usuario te comparte información de sus transacciones, analízala con detalle.
Sé conciso, claro y amigable. Usa pesos mexicanos (MXN) como moneda.
No hagas suposiciones sobre datos que no tienes.`;

export async function POST(req: NextRequest) {
  try {
    // Verificar sesión activa
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response("No autorizado", { status: 401 });
    }

    const { mensajes, incluirContexto } = await req.json();

    // Obtener transacciones recientes como contexto (solo si se solicita)
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

    const sistemaFinal = PROMPT_SISTEMA + contextoTransacciones;

    // Streaming con claude-opus-4-6
    const stream = await anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: sistemaFinal,
      messages: mensajes,
    });

    // Devolver como ReadableStream compatible con el browser
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
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

  const ultimas = transacciones.slice(0, 10).map((t) =>
    `  - [${t.fecha}] ${t.tipo === "ingreso" ? "+" : "-"}$${Number(t.monto).toFixed(2)} | ${t.descripcion || t.categoria}`
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
