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
export async function enviarTypingWA(para: string): Promise<void> {
  // WhatsApp Cloud API no soporta typing indicator directo,
  // pero podemos simular con una reacción de "visto" inmediata.
  // Dejamos placeholder por si Meta lo agrega.
}
