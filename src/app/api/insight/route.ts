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
          content: `Eres Lani 🐑, asistente financiera. Con base en estos datos del usuario, genera UN insight breve, útil y específico en español mexicano casual. Máximo 2 oraciones. Sin saludos, ve directo al punto. Sé honesta aunque sea incómodo.

Datos:
${resumen}

Responde SOLO el insight, sin introducción ni cierre.`,
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
