import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { enviarMensajeWA, marcarLeidoWA, transcribirAudioWA } from "@/lib/whatsapp";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Cuántos mensajes de historial enviamos a Claude (5 intercambios = 10 filas)
const MAX_HISTORIAL = 10;
// Máximo de mensajes por teléfono por ventana de tiempo
const RATE_LIMIT_MAX     = 5;
const RATE_LIMIT_VENTANA = 60; // segundos

// Supabase admin para buscar usuarios por teléfono (bypass RLS)
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── GET: verificación del webhook con Meta ───────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Token inválido", { status: 403 });
}

// ── POST: recibe mensajes de WhatsApp ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Extraer el mensaje del payload de Meta
  const entry   = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value   = changes?.value;
  const mensaje = value?.messages?.[0];

  // Si no hay mensaje (notificación de status/delivery), responder OK
  if (!mensaje) return Response.json({ ok: true });

  const telefonoRaw = mensaje.from as string;
  const messageId   = mensaje.id as string;
  const texto       = (mensaje.text?.body ?? "") as string;
  const tipo        = mensaje.type as string;

  // ── Guard 1: ignorar mensajes propios (echo del business) ──────────────────
  const phoneNumberId = value?.metadata?.phone_number_id as string | undefined;
  const fromPhoneId   = mensaje.from_me === true;
  if (fromPhoneId || (phoneNumberId && telefonoRaw === phoneNumberId)) {
    return Response.json({ ok: true });
  }

  // ── Guard 2: ignorar mensajes antiguos (>90s) — evita reprocessar retries ──
  const timestampMensaje = parseInt(mensaje.timestamp ?? "0", 10);
  const ahoraEpoch = Math.floor(Date.now() / 1000);
  if (timestampMensaje > 0 && ahoraEpoch - timestampMensaje > 90) {
    console.log(`⏱ Mensaje ${messageId} ignorado: ${ahoraEpoch - timestampMensaje}s tarde`);
    return Response.json({ ok: true, motivo: "mensaje_expirado" });
  }

  // Normalizar número mexicano 521XXXXXXXXXX → 52XXXXXXXXXX
  const telefono = telefonoRaw.startsWith("521") && telefonoRaw.length === 13
    ? "52" + telefonoRaw.slice(3)
    : telefonoRaw;

  // ── Guard 3: solo texto y audio — ignorar stickers, imágenes, reacciones ──
  const esTexto = tipo === "text" && texto.trim().length > 0;
  const esAudio = tipo === "audio" || tipo === "voice";

  if (!esTexto && !esAudio) {
    await marcarLeidoWA(messageId);
    return Response.json({ ok: true });
  }

  // Si es audio, transcribir con Whisper antes de continuar
  let textoFinal_entrada = texto;
  if (esAudio) {
    const mediaId = mensaje.audio?.id ?? mensaje.voice?.id ?? "";
    if (!mediaId) {
      await marcarLeidoWA(messageId);
      return Response.json({ ok: true });
    }
    const transcripcion = await transcribirAudioWA(mediaId);
    if (!transcripcion) {
      await enviarMensajeWA(telefono, "No pude entender el audio 🐑 ¿Puedes escribirlo?");
      return Response.json({ ok: true });
    }
    if (transcripcion === "AUDIO_DEMASIADO_LARGO") {
      await enviarMensajeWA(telefono, "El audio es muy largo 🐑 Manda uno de menos de 1 minuto.");
      return Response.json({ ok: true });
    }
    textoFinal_entrada = transcripcion;
    console.log(`🎤 Audio transcrito: "${transcripcion}"`);
  }

  const supabase = supabaseAdmin();

  // ── Guard 4: deduplicación por messageId ──────────────────────────────────
  const { data: yaExiste } = await supabase
    .from("webhook_wa_procesados")
    .select("id")
    .eq("message_id", messageId)
    .maybeSingle();

  if (yaExiste) {
    console.log(`⚠️ Mensaje ${messageId} ya procesado, ignorando`);
    return Response.json({ ok: true, motivo: "duplicado" });
  }

  // ── Guard 5: rate limiting — máximo N mensajes por minuto por teléfono ────
  const ventanaDesde = new Date(Date.now() - RATE_LIMIT_VENTANA * 1000).toISOString();
  const { count: mensajesRecientes } = await supabase
    .from("webhook_wa_procesados")
    .select("id", { count: "exact", head: true })
    .eq("telefono", telefono)
    .gte("created_at", ventanaDesde);

  if ((mensajesRecientes ?? 0) >= RATE_LIMIT_MAX) {
    console.warn(`🚫 Rate limit alcanzado para ${telefono}`);
    await supabase
      .from("webhook_wa_procesados")
      .insert({ message_id: messageId, telefono, created_at: new Date().toISOString() });
    await enviarMensajeWA(telefono, "Vamos más despacio 🐑 Espera un momento antes de mandarme más mensajes.");
    return Response.json({ ok: true, motivo: "rate_limit" });
  }

  // Registrar messageId ANTES de procesar (evita carrera si Vercel retries en paralelo)
  await supabase
    .from("webhook_wa_procesados")
    .insert({ message_id: messageId, telefono, created_at: new Date().toISOString() });

  // Marcar como leído inmediatamente
  await marcarLeidoWA(messageId);

  // Buscar el usuario vinculado a este número
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre_completo")
    .eq("telefono_whatsapp", telefono)
    .single();

  // Si el número no está vinculado a ninguna cuenta
  if (!perfil) {
    await enviarMensajeWA(
      telefono,
      "Hola 🐑 Soy Lani. Para usar WhatsApp necesitas vincular tu número en la app:\n\n" +
      "1. Abre la app de Lani\n" +
      "2. Ve a Perfil\n" +
      "3. Escribe tu número de WhatsApp\n\n" +
      "¡Y listo! Ya podremos hablar por aquí."
    );
    return Response.json({ ok: true });
  }

  const usuarioId = perfil.id as string;
  const nombre    = (perfil.nombre_completo as string ?? "").split(" ")[0];
  const hoy       = new Date().toISOString().split("T")[0];

  // ── Cargar historial conversacional + contexto financiero en paralelo ──────
  const [
    { data: historialRows },
    { data: transacciones },
    { data: metas },
  ] = await Promise.all([
    supabase
      .from("mensajes_wa")
      .select("rol, contenido")
      .eq("telefono", telefono)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORIAL),
    supabase
      .from("transacciones")
      .select("id, monto, descripcion, categoria, tipo, fecha")
      .eq("usuario_id", usuarioId)
      .order("fecha", { ascending: false })
      .limit(150),
    supabase
      .from("metas")
      .select("id, nombre, emoji, monto_objetivo, monto_actual")
      .eq("usuario_id", usuarioId)
      .limit(10),
  ]);

  // El historial viene en orden DESC; lo invertimos para orden cronológico
  // Validar que los roles alternen correctamente (evita error 400 en Anthropic)
  const historialCrudo: Anthropic.MessageParam[] = (historialRows ?? [])
    .reverse()
    .map((r) => ({
      role: r.rol as "user" | "assistant",
      content: r.contenido as string,
    }));

  const historial = normalizarHistorial(historialCrudo);

  const contexto = construirContextoWA(transacciones ?? [], metas ?? []);

  // Prompt de Lani adaptado para WhatsApp
  const sistemaWA = `Eres Lani 🐑, asistente financiera personal.
El nombre del usuario es ${nombre || "amigo"}.
Fecha de hoy: ${hoy}.

TONO:
- Usa "tú", nunca "usted"
- Español mexicano casual y directo
- Respuestas CORTAS — esto es WhatsApp, no un ensayo
- Sin tablas, sin listas largas
- Usa *negrita* con asteriscos simples (formato WhatsApp)
- Números siempre con $ y comas: $1,200

REGISTRO ULTRA-RÁPIDO:
Cuando el usuario escriba algo como "uber 85", "comida 320", "nómina 15000":
- Registra INMEDIATAMENTE con crear_transaccion
- Confirma en una línea: "✓ Uber $85 anotado 🐑"
- Sin preguntas, sin confirmaciones previas

REGLAS:
1. Registra cualquier gasto/ingreso mencionado sin pedir confirmación
2. Si pide info financiera, responde con datos reales del contexto
3. Si pide modificar o borrar una transacción, usa la herramienta correcta con el ID completo de la lista
4. Si pide abonar o agregar dinero a una meta, usa abonar_meta con el ID completo de la meta
5. Tienes acceso al historial — úsalo para referencias como "la última", "esa", "bórrala"
6. Nunca menciones que eres IA o Claude

Categorías válidas: Comida, Supermercado, Transporte, Entretenimiento, Salud, Servicios, Ropa, Hogar, Educación, Otros

${contexto}`;

  // Herramientas disponibles
  const herramientas: Anthropic.Tool[] = [
    {
      name: "crear_transaccion",
      description: "Registra un gasto o ingreso",
      input_schema: {
        type: "object" as const,
        properties: {
          monto:       { type: "number",  description: "Monto en pesos MXN, siempre positivo" },
          descripcion: { type: "string",  description: "Descripción breve" },
          categoria:   { type: "string",  description: "Categoría" },
          tipo:        { type: "string",  enum: ["gasto", "ingreso"] },
          fecha:       { type: "string",  description: "Fecha YYYY-MM-DD, default hoy" },
        },
        required: ["monto", "tipo", "categoria"],
      },
    },
    {
      name: "actualizar_transaccion",
      description: "Modifica una transacción existente. Usa el ID completo de la lista.",
      input_schema: {
        type: "object" as const,
        properties: {
          id:          { type: "string",  description: "ID completo (UUID) de la transacción" },
          fecha:       { type: "string" },
          monto:       { type: "number" },
          descripcion: { type: "string" },
          categoria:   { type: "string" },
          tipo:        { type: "string", enum: ["gasto", "ingreso"] },
        },
        required: ["id"],
      },
    },
    {
      name: "eliminar_transaccion",
      description: "Elimina una transacción. Usa el ID completo de la lista.",
      input_schema: {
        type: "object" as const,
        properties: {
          id: { type: "string", description: "ID completo (UUID) de la transacción" },
        },
        required: ["id"],
      },
    },
    {
      name: "abonar_meta",
      description: "Agrega dinero a una meta de ahorro del usuario. Usa el ID completo de la meta.",
      input_schema: {
        type: "object" as const,
        properties: {
          id:    { type: "string", description: "ID completo (UUID) de la meta" },
          monto: { type: "number", description: "Cantidad en pesos a abonar" },
        },
        required: ["id", "monto"],
      },
    },
  ];

  const CATEGORIAS_VALIDAS = new Set([
    "Comida", "Supermercado", "Transporte", "Entretenimiento",
    "Salud", "Servicios", "Ropa", "Hogar", "Educación", "Otros",
  ]);

  // Mensajes con historial + mensaje actual
  const mensajesParaClaude: Anthropic.MessageParam[] = [
    ...historial,
    { role: "user", content: textoFinal_entrada },
  ];

  // Primera llamada a Claude — con try/catch para evitar que el webhook tire 500
  let textoFinal = "";
  try {
    const respuesta = await anthropic.messages.create({
      model: "claude-sonnet-4-6",   // Sonnet: más confiable en tool use que Haiku
      max_tokens: 512,
      system: sistemaWA,
      tools: herramientas,
      messages: mensajesParaClaude,
    });

    if (respuesta.stop_reason === "tool_use") {
      const bloque = respuesta.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock;

      if (bloque.name === "crear_transaccion") {
        const d = bloque.input as { monto: number; descripcion?: string; categoria: string; tipo: string; fecha?: string };
        const monto     = Math.abs(Number(d.monto));
        const tipoTx    = d.tipo === "ingreso" ? "ingreso" : "gasto";
        const categoria = CATEGORIAS_VALIDAS.has(d.categoria) ? d.categoria : "Otros";
        const fecha     = d.fecha || hoy;

        const { error } = await supabase.from("transacciones").insert({
          usuario_id:  usuarioId,
          monto,
          descripcion: d.descripcion || categoria,
          categoria,
          tipo: tipoTx,
          fecha,
        });

        const resultado = error ? `Error: ${error.message}` : "Transacción guardada.";
        textoFinal = await segundaLlamadaClaude(
          anthropic, sistemaWA, herramientas,
          mensajesParaClaude, respuesta.content, bloque.id, resultado
        );

      } else if (bloque.name === "actualizar_transaccion") {
        const d = bloque.input as { id: string; fecha?: string; monto?: number; descripcion?: string; categoria?: string; tipo?: string };
        const cambios: Record<string, unknown> = {};
        if (d.fecha)       cambios.fecha       = d.fecha;
        if (d.monto)       cambios.monto       = Math.abs(Number(d.monto));
        if (d.descripcion) cambios.descripcion = d.descripcion;
        if (d.categoria)   cambios.categoria   = CATEGORIAS_VALIDAS.has(d.categoria!) ? d.categoria : "Otros";
        if (d.tipo)        cambios.tipo        = d.tipo;

        const { error } = await supabase.from("transacciones")
          .update(cambios).eq("id", d.id).eq("usuario_id", usuarioId);

        const resultado = error ? `Error: ${error.message}` : "Transacción actualizada.";
        textoFinal = await segundaLlamadaClaude(
          anthropic, sistemaWA, herramientas,
          mensajesParaClaude, respuesta.content, bloque.id, resultado
        );

      } else if (bloque.name === "eliminar_transaccion") {
        const d = bloque.input as { id: string };
        const { error } = await supabase.from("transacciones")
          .delete().eq("id", d.id).eq("usuario_id", usuarioId);

        const resultado = error ? `Error: ${error.message}` : "Transacción eliminada.";
        textoFinal = await segundaLlamadaClaude(
          anthropic, sistemaWA, herramientas,
          mensajesParaClaude, respuesta.content, bloque.id, resultado
        );

      } else if (bloque.name === "abonar_meta") {
        const d = bloque.input as { id: string; monto: number };
        const abono = Math.abs(Number(d.monto));

        // Obtener monto actual para sumar
        const { data: metaActual, error: errLeer } = await supabase
          .from("metas")
          .select("monto_actual, monto_objetivo, nombre")
          .eq("id", d.id)
          .eq("usuario_id", usuarioId)
          .single();

        let resultado: string;
        if (errLeer || !metaActual) {
          resultado = "Error: no se encontró la meta.";
        } else {
          const nuevoMonto = Math.min(
            Number(metaActual.monto_actual) + abono,
            Number(metaActual.monto_objetivo)
          );
          const { error: errUpdate } = await supabase
            .from("metas")
            .update({ monto_actual: nuevoMonto })
            .eq("id", d.id)
            .eq("usuario_id", usuarioId);

          resultado = errUpdate
            ? `Error: ${errUpdate.message}`
            : `Abono de $${abono} a "${metaActual.nombre}" registrado. Nuevo total: $${nuevoMonto} de $${metaActual.monto_objetivo}.`;
        }

        textoFinal = await segundaLlamadaClaude(
          anthropic, sistemaWA, herramientas,
          mensajesParaClaude, respuesta.content, bloque.id, resultado
        );
      }
    } else {
      const textoRespuesta = (respuesta.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text ?? "";
      // Guard: si Claude dice "anotado/registrado/guardado" sin haber llamado una herramienta,
      // es una confirmación falsa — no la mandamos para no engañar al usuario.
      const esFalsaConfirmacion = /\b(anot[aó]|registr[aó]|guard[aó])\b/i.test(textoRespuesta);
      if (esFalsaConfirmacion) {
        console.warn(`⚠️ Confirmación falsa detectada para ${telefono}: "${textoRespuesta}"`);
        textoFinal = "No pude registrar eso. Intenta de nuevo con el monto y descripción, por ejemplo: \"helado 175\"";
      } else {
        textoFinal = textoRespuesta;
      }
    }
  } catch (err) {
    console.error("Error en llamada a Claude:", err);
    await enviarMensajeWA(telefono, "Tuve un problema técnico 🐑 Intenta de nuevo en un momento.");
    return Response.json({ ok: true, motivo: "error_claude" });
  }

  // Enviar respuesta al usuario por WhatsApp
  if (textoFinal) {
    await enviarMensajeWA(telefono, textoFinal);
  }

  // ── Guardar intercambio en historial conversacional ───────────────────────
  if (textoFinal) {
    await supabase.from("mensajes_wa").insert([
      { telefono, rol: "user",      contenido: textoFinal_entrada },
      { telefono, rol: "assistant", contenido: textoFinal },
    ]);
  }

  return Response.json({ ok: true });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Segunda llamada a Claude con el resultado de la herramienta
async function segundaLlamadaClaude(
  anthropic: Anthropic,
  sistema: string,
  herramientas: Anthropic.Tool[],
  mensajesOriginales: Anthropic.MessageParam[],
  contenidoAsistente: Anthropic.ContentBlock[],
  toolUseId: string,
  resultado: string
): Promise<string> {
  const r = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    system: sistema,
    tools: herramientas,
    messages: [
      ...mensajesOriginales,
      { role: "assistant", content: contenidoAsistente },
      { role: "user", content: [{ type: "tool_result", tool_use_id: toolUseId, content: resultado }] },
    ],
  });
  return (r.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text ?? "✓ Listo.";
}

// Garantiza que los mensajes del historial alternen user/assistant
// (evita error 400 de Anthropic si hubo un fallo previo al guardar)
function normalizarHistorial(msgs: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const resultado: Anthropic.MessageParam[] = [];
  for (const msg of msgs) {
    if (resultado.length > 0 && resultado[resultado.length - 1].role === msg.role) {
      // Mismo rol consecutivo: reemplazar (quedarnos con el más reciente)
      resultado[resultado.length - 1] = msg;
    } else {
      resultado.push(msg);
    }
  }
  // El historial debe terminar en "assistant" para que el nuevo "user" sea válido
  if (resultado.length > 0 && resultado[resultado.length - 1].role === "user") {
    resultado.pop();
  }
  return resultado;
}

// Resumen financiero compacto para el contexto de WhatsApp
// IMPORTANTE: usa IDs completos (UUID) para que Claude pueda modificar/borrar
function construirContextoWA(
  transacciones: { id: string; monto: number; descripcion: string; categoria: string; tipo: string; fecha: string }[],
  metas: { id: string; nombre: string; emoji: string; monto_objetivo: number; monto_actual: number }[]
): string {
  if (!transacciones.length) return "";

  const mesActual = new Date().toISOString().slice(0, 7);
  const txMes = transacciones.filter((t) => t.fecha.startsWith(mesActual));
  const ingresos = txMes.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
  const gastos   = txMes.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);

  const porCat: Record<string, number> = {};
  txMes.filter((t) => t.tipo === "gasto").forEach((t) => {
    porCat[t.categoria] = (porCat[t.categoria] || 0) + Number(t.monto);
  });
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1])
    .slice(0, 5).map(([c, m]) => `${c}:$${Math.round(m)}`).join(", ");

  // IDs completos para que Claude pueda hacer update/delete correctamente
  const lista = transacciones.slice(0, 80).map((t) =>
    `[${t.id}] ${t.fecha} ${t.tipo === "ingreso" ? "I" : "G"} $${Number(t.monto).toFixed(0)} ${t.descripcion} (${t.categoria})`
  ).join("\n");

  const metasTxt = metas.length
    ? "\n\nMetas:\n" + metas.map((m) => {
        const pct = Math.round(m.monto_actual / m.monto_objetivo * 100);
        return `[${m.id}] ${m.emoji}${m.nombre} — $${Math.round(m.monto_actual)} de $${Math.round(m.monto_objetivo)} (${pct}%)`;
      }).join("\n")
    : "";

  return `\n--- FINANZAS ---\nMes ${mesActual}: Ingresos $${Math.round(ingresos)} | Gastos $${Math.round(gastos)} | Balance $${Math.round(ingresos - gastos)}\nTop categorías: ${cats}${metasTxt}\n\nÚltimas transacciones:\n${lista}\n---`;
}
