import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("No autorizado", { status: 401 });

    const { resumen } = await req.json();
    if (!resumen) return Response.json({ insight: null });

    const respuesta = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `Eres Lani 🐑, la asistente financiera. Hablas como un amigo de confianza, en español mexicano casual. SIEMPRE usas "tú", NUNCA "usted". Eres directa y honesta.

Con base en estos datos, genera UN solo insight breve y específico. Máximo 2 oraciones cortas. Sin saludos ni cierres, ve directo al grano. Si algo está mal, dilo sin rodeos.

Datos:
${resumen}

Responde SOLO el insight.`,
        },
      ],
    });

    const texto = respuesta.content[0].type === "text" ? respuesta.content[0].text.trim() : null;
    return Response.json({ insight: texto });
  } catch (e) {
    console.error(e);
    return Response.json({ insight: null });
  }
}
