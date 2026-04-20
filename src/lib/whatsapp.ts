// ── Helper para enviar mensajes de WhatsApp via Meta Cloud API ──────────────

const WA_API_URL = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

// Envía un mensaje de texto al número indicado
export async function enviarMensajeWA(para: string, texto: string): Promise<void> {
  const res = await fetch(WA_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: para,
      type: "text",
      text: { body: texto.slice(0, 4096) }, // límite de WhatsApp
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Error enviando WhatsApp:", err);
    throw new Error(`WhatsApp API error: ${res.status}`);
  }
}

// Marca el mensaje como "leído" (doble palomita azul)
export async function marcarLeidoWA(messageId: string): Promise<void> {
  await fetch(WA_API_URL.replace("/messages", "/messages"), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch(() => { /* no crítico */ });
}

// Envía indicador de "escribiendo..." (typing indicator)
export async function enviarTypingWA(_para: string): Promise<void> {
  // WhatsApp Cloud API no soporta typing indicator directo todavía.
}

// ── Descarga un archivo de media de WhatsApp y lo transcribe con Whisper ─────
// Retorna el texto transcrito, o null si falla.
export async function transcribirAudioWA(mediaId: string): Promise<string | null> {
  try {
    // 1. Obtener la URL de descarga del media
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}`,
      { headers: { "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}` } }
    );
    if (!metaRes.ok) {
      console.error("Error obteniendo media URL:", await metaRes.text());
      return null;
    }
    const { url } = await metaRes.json() as { url: string };

    // 2. Descargar el audio (viene como .ogg/opus)
    const audioRes = await fetch(url, {
      headers: { "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}` },
    });
    if (!audioRes.ok) {
      console.error("Error descargando audio:", audioRes.status);
      return null;
    }

    // Guard: rechazar audios >1MB (~1 minuto de voz en WhatsApp)
    // Evita que un cliente mande un audio de horas y cueste una fortuna en Whisper
    const MAX_BYTES = 1 * 1024 * 1024; // 1 MB
    const contentLength = audioRes.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
      console.warn(`Audio rechazado: ${contentLength} bytes (>${MAX_BYTES})`);
      return "AUDIO_DEMASIADO_LARGO";
    }

    const audioBuffer = await audioRes.arrayBuffer();

    // Double-check tamaño real del buffer (por si el header no venía)
    if (audioBuffer.byteLength > MAX_BYTES) {
      console.warn(`Audio rechazado post-descarga: ${audioBuffer.byteLength} bytes`);
      return "AUDIO_DEMASIADO_LARGO";
    }

    // 3. Enviar a Whisper (OpenAI)
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: "audio/ogg" });
    formData.append("file", blob, "audio.ogg");
    formData.append("model", "whisper-1");
    formData.append("language", "es");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      console.error("Error Whisper:", await whisperRes.text());
      return null;
    }

    const { text } = await whisperRes.json() as { text: string };
    return text?.trim() || null;
  } catch (err) {
    console.error("Error en transcribirAudioWA:", err);
    return null;
  }
}
