import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { texto } = await req.json();

  if (!texto || typeof texto !== "string") {
    return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Sin API key" }, { status: 503 });
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "nova",      // joven, femenina, natural en español
      input: texto.slice(0, 4096),
      speed: 1.0,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenAI TTS error:", err);
    return NextResponse.json({ error: "TTS falló" }, { status: 502 });
  }

  const buffer = await res.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
