import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { enviarMensajeWA, marcarLeidoWA, transcribirAudioWA } from "@/lib/whatsapp";
import { calcularDistribucionQuincena } from "@/lib/distribucion-quincena";
import { clasificarDeduccion, ETIQUETAS_DEDUCCION } from "@/lib/isr-calculator";

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
  // Leer el body como texto crudo para poder verificar la firma de Meta
  const rawBody = await req.text();

  // ── Verificar firma HMAC-SHA256 de Meta (seguridad) ────────────────────────
  // Sin esto, cualquiera que conozca la URL puede mandar requests falsos
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const firma = req.headers.get("x-hub-signature-256");
    const { createHmac } = await import("node:crypto");
    const esperada = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (firma !== esperada) {
      console.warn("⚠️ Firma Meta inválida — request rechazado");
      return new Response("Firma inválida", { status: 401 });
    }
  }

  const body = JSON.parse(rawBody);

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
  const anoActual = new Date().getFullYear();

  const [
    { data: historialRows },
    { data: transacciones },
    { data: metas },
    { data: deduciblesAno },
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
    supabase
      .from("transacciones")
      .select("monto, descripcion, categoria")
      .eq("usuario_id", usuarioId)
      .eq("tipo", "gasto")
      .gte("fecha", `${anoActual}-01-01`)
      .in("categoria", ["Salud", "Educación", "Servicios", "Otros"]),
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

  // Detectar si el último mensaje de Lani fue una pregunta de aclaración
  const ultimoMensajeLani = historialRows?.[0]?.rol === "assistant" ? historialRows[0].contenido as string : null;
  const estabaPidiendoAclaracion = ultimoMensajeLani != null && /\?/.test(ultimoMensajeLani);

  const contexto = construirContextoWA(transacciones ?? [], metas ?? [], deduciblesAno ?? [], anoActual);

  // Prompt de Lani adaptado para WhatsApp
  const sistemaWA = `Eres Lani, la asistente financiera personal de ${nombre || "tu usuario"}.
Fecha de hoy: ${hoy}.

QUIÉN ERES:
Eres una borrega chida, directa y con mucha personalidad. Llevas las finanzas de ${nombre || "tu usuario"} como si fueras su mejor amiga que además sabe un chingo de dinero. No eres un bot genérico — eres Lani, y se nota.

PERSONALIDAD (MUY IMPORTANTE):
- Hablas como cuate de confianza, no como banco ni asistente corporativo
- Usas español mexicano natural: "wey", "órale", "chido", "a huevo", "qué onda", "nel", "simon", "sale"
- Tienes opiniones. Si alguien gasta demasiado en algo, lo dices con cariño pero sin filtro
- Usas humor cuando viene al caso — un comentario sarcástico ligero si el gasto es ridículo, una felicitación genuina si ahorraron bien
- Nunca eres condescendiente ni regañona, pero sí honesta
- Celebras los buenos momentos financieros ("¡a huevo, así se hace!")
- Cuando registras algo sin drama, confirmas rápido y de vez en cuando agregas un comentario con sabor

TONO EN WHATSAPP — MUY IMPORTANTE:
- Respuestas CORTAS. Esto es WhatsApp, no un ensayo
- Máximo 3-4 líneas por mensaje, salvo que pidan un resumen detallado
- Sin tablas. Sin listas largas. Sin bullets con guión
- *negrita* con asteriscos simples (formato WhatsApp nativo)
- Números siempre con $ y comas: $1,200
- Emojis con criterio — uno o dos cuando dan sabor, no en cada oración

EJEMPLOS DE CONFIRMACIONES CON PERSONALIDAD:
- "uber 85" → "✓ Uber $85 anotado. Ya va acumulando ese Uber, wey 👀"
- "caguama 60" → "✓ Caguama $60 anotada en Comida. Salud 🍺"
- "nómina 20000" → "✓ Nómina $20,000 anotada. Llegó el quince, a administrarlo bien 💪"
- "300 en zapatos" → "✓ Zapatos $300 anotados. Inversión necesaria o antojo? Jajaja"
- Si el gasto es muy alto o inusual → un comentario breve y directo sin regañar

DETECCIÓN DE DUPLICADOS — REGLA EXACTA:
Para saber si algo ya está registrado, revisa ÚNICAMENTE la lista de transacciones del contexto financiero (la sección "Transacciones ya guardadas en DB").
- Si el movimiento YA aparece en esa lista → avisa que podría ser duplicado y pregunta
- Si NO aparece en esa lista → regístralo de inmediato, aunque en el chat hayas dicho antes que lo registraste
NUNCA uses el historial del chat para decidir si algo es duplicado. El usuario pudo haber borrado la transacción desde la app — lo que importa es lo que está en la DB ahora.

MEMORIA Y CONTEXTO — MUY IMPORTANTE:
Tienes acceso al historial completo de la conversación. Úsalo siempre:
- Si el usuario dice "esa", "la última", "bórrala", "corrígela" → busca en el historial a qué transacción se refiere
- Si el usuario responde "sí", "exacto", "eso" → revisa qué pregunta hiciste antes y actúa en consecuencia
- Si estabas pidiendo aclaración sobre un registro (monto, categoría) y el usuario responde → usa TODA la conversación para entender qué querían registrar originalmente y registra ESO, no otra cosa

FLUJO DE ACLARACIÓN — CRÍTICO:
Cuando el historial muestra que pediste aclaración:
1. Lee el mensaje ORIGINAL del usuario (el que causó la duda)
2. Lee su respuesta aclaratoria
3. Combina ambos para registrar la transacción correcta
4. El monto y descripción SIEMPRE vienen de lo que el usuario dijo, NUNCA del historial de transacciones guardadas
5. JAMÁS registres una transacción del historial como si fuera nueva — ese historial es solo referencia

REGLA DE ORO — PROHIBICIÓN ABSOLUTA:
El monto a registrar SIEMPRE viene del mensaje del usuario. NUNCA del contexto financiero.
Si el usuario dice "120 pejecoins", registra $120. Si dice "me gasté trescientos", registra $300.
Si el usuario usa slang, broma o moneda inventada, extrae el número que dijo y úsalo.
ESTÁ PROHIBIDO usar cualquier monto que aparezca en la lista de transacciones guardadas para crear una transacción nueva.

Ejemplo de lo que NUNCA debes hacer:
- Usuario dice "120 pejecoins en comida" → el contexto tiene "$167.50 Oxxo" → NO registres $167.50 Oxxo. Registra $120 Comida.
- Si no entiendes la moneda pero sí el número, usa el número en pesos MXN.
- Si no entiendes ni el número, pregunta UNA sola vez: "¿Cuánto fue exactamente?"

REGLAS OPERATIVAS:
1. Registra cualquier gasto/ingreso sin pedir confirmación previa
2. Si pide info financiera, da datos reales del contexto — sé concreta, no vaga
3. Para modificar o borrar, usa la herramienta con el ID completo
4. Para abonar a una meta, usa abonar_meta con el ID completo
5. Nunca menciones que eres IA, Claude o cualquier software

Categorías válidas: Comida, Supermercado, Transporte, Entretenimiento, Salud, Servicios, Ropa, Hogar, Educación, Otros

DEDUCCIONES ISR — menciona solo cuando sea obvio por la descripción. Usa los límites reales del SAT 2025 y el acumulado del contexto para dar info concreta:

Qué es deducible y sus límites:
- Gastos médicos (Salud): consulta médica, dentista, psicólogo, nutriólogo, óptica/lentes, hospital, medicamentos con receta, análisis clínicos → sin límite fijo, pero tope del 15% del ingreso anual o 5 UMAs ($58,835). Si ya hay acumulado en el contexto, dile cuánto lleva.
- Colegiaturas (Educación): límites anuales — preescolar $14,200 | primaria $12,900 | secundaria $19,900 | prof. técnico $17,100 | bachillerato $24,500. Detecta el nivel por la descripción (prepa, kinder, primaria, etc.). Si no puedes detectarlo, pregunta: "¿Es de qué nivel?" para dar el tope exacto. Si hay acumulado, calcula cuánto le queda del límite.
- Seguro de gastos médicos (Servicios): prima del seguro GMM → deducible sin límite específico.
- Intereses de crédito hipotecario (Servicios): solo los intereses reales (descontando inflación) → deducible.
- Donativos (Otros): Cruz Roja, UNICEF, instituciones autorizadas SAT → hasta 7% del ingreso del año anterior.

Cómo mencionarlo:
- Una línea al final, tono casual, nunca regañón
- Si hay acumulado en el contexto: "Ya llevas $X en gastos médicos este año."
- Si se acerca al límite de colegiatura: "Ojo, el límite de [nivel] es $X al año — llevas $Y, te quedan $Z."
- Si ya superó el límite: "Ya rebasaste el tope deducible de colegiaturas para este nivel."
- NO menciones en: comida, uber, ropa, entretenimiento, supermercado, gasolina, o cuando no sea claro.
- Solo en gastos, nunca en ingresos. Máximo dos líneas extra.

${contexto}`;

  // Herramientas disponibles
  const herramientas: Anthropic.Tool[] = [
    {
      name: "crear_transaccion",
      description: "Registra un gasto o ingreso",
      input_schema: {
        type: "object" as const,
        properties: {
          monto:        { type: "number",  description: "Monto en pesos MXN, siempre positivo" },
          descripcion:  { type: "string",  description: "Descripción breve" },
          categoria:    { type: "string",  description: "Categoría" },
          tipo:         { type: "string",  enum: ["gasto", "ingreso"] },
          fecha:        { type: "string",  description: "Fecha YYYY-MM-DD, default hoy" },
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
          id:           { type: "string",  description: "ID completo (UUID) de la transacción" },
          fecha:        { type: "string" },
          monto:        { type: "number" },
          descripcion:  { type: "string" },
          categoria:    { type: "string" },
          tipo:         { type: "string", enum: ["gasto", "ingreso"] },
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

  // Si Lani estaba pidiendo aclaración, inyectamos un recordatorio para que
  // Claude use el contexto conversacional y no agarre datos del historial financiero
  const notaAclaracion = estabaPidiendoAclaracion
    ? `[NOTA INTERNA — ACCIÓN REQUERIDA: Tu mensaje anterior fue una pregunta de aclaración y el usuario acaba de responderte. DEBES llamar AHORA a crear_transaccion con el tool_use. NO respondas en texto. Pasos: (1) Lee el mensaje ORIGINAL del usuario antes de tu pregunta. (2) Combínalo con su respuesta de ahora. (3) Llama crear_transaccion con el monto y descripción que EL USUARIO dijo — jamás uses montos del historial financiero guardado.]`
    : null;

  // Mensajes con historial + mensaje actual
  const mensajesParaClaude: Anthropic.MessageParam[] = [
    ...historial,
    {
      role: "user",
      content: notaAclaracion
        ? `${notaAclaracion}\n\n${textoFinal_entrada}`
        : textoFinal_entrada,
    },
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
        const d = bloque.input as {
          monto: number; descripcion?: string; categoria: string; tipo: string; fecha?: string;
        };
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

        if (error) {
          console.error(`❌ Error al guardar transacción para ${usuarioId}:`, error);
          Sentry.captureException(new Error(error.message), { tags: { contexto: "crear_transaccion", usuarioId } });
        } else {
          console.log(`✅ Transacción guardada: ${tipoTx} $${monto} ${d.descripcion || categoria} (${usuarioId})`);
        }

        const resultado = error ? `Error al guardar: ${error.message}` : "Transacción guardada correctamente.";
        textoFinal = await segundaLlamadaClaude(
          anthropic, sistemaWA, herramientas,
          mensajesParaClaude, respuesta.content, bloque.id, resultado
        );

        // ── Distribución inteligente de quincena (fire-and-forget) ────────────
        // Si fue un ingreso grande (≥ $5,000), mandamos el plan de distribución
        // como segundo mensaje después de la confirmación principal.
        if (!error && tipoTx === "ingreso" && monto >= 5000) {
          (async () => {
            try {
              const msgDistribucion = await calcularDistribucionQuincena(
                supabase, usuarioId, monto, nombre
              );
              if (msgDistribucion) {
                // Pequeña pausa para que el mensaje de confirmación llegue primero
                await new Promise((r) => setTimeout(r, 1500));
                await enviarMensajeWA(telefono, msgDistribucion);
              }
            } catch (errDist) {
              console.error("Error al calcular distribución quincena:", errDist);
            }
          })();
        }

      } else if (bloque.name === "actualizar_transaccion") {
        const d = bloque.input as {
          id: string; fecha?: string; monto?: number; descripcion?: string;
          categoria?: string; tipo?: string;
        };
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
      // Cubre formas verbales: anota/anotó/anotada/anotado/registra/registró/registrada/registrado/etc.
      const esFalsaConfirmacion = /\b(anot[aó]d?[ao]?|registr[aó]d?[ao]?|guard[aó]d?[ao]?)\b/i.test(textoRespuesta);
      if (esFalsaConfirmacion) {
        console.warn(`⚠️ Confirmación falsa detectada para ${telefono}: "${textoRespuesta.slice(0, 120)}"`);
        Sentry.captureMessage("Confirmación falsa sin tool_use", { level: "warning", tags: { telefono }, extra: { textoRespuesta } });
        textoFinal = "No pude registrar eso, intenta de nuevo 🐑 Dime el monto y qué fue, por ejemplo: \"comida 120\"";
      } else {
        textoFinal = textoRespuesta;
      }
    }
  } catch (err) {
    console.error("Error en llamada a Claude:", err);
    Sentry.captureException(err, { tags: { contexto: "claude_webhook", telefono } });
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
  metas: { id: string; nombre: string; emoji: string; monto_objetivo: number; monto_actual: number }[],
  deduciblesAno: { monto: number; descripcion: string; categoria: string }[],
  anoActual: number,
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
  // ⚠️ ESTAS TRANSACCIONES YA ESTÁN GUARDADAS — solo son referencia, NO las registres de nuevo
  const lista = transacciones.slice(0, 80).map((t) =>
    `[${t.id}] ${t.fecha} ${t.tipo === "ingreso" ? "I" : "G"} $${Number(t.monto).toFixed(0)} ${t.descripcion} (${t.categoria})`
  ).join("\n");

  const metasTxt = metas.length
    ? "\n\nMetas:\n" + metas.map((m) => {
        const pct = Math.round(m.monto_actual / m.monto_objetivo * 100);
        return `[${m.id}] ${m.emoji}${m.nombre} — $${Math.round(m.monto_actual)} de $${Math.round(m.monto_objetivo)} (${pct}%)`;
      }).join("\n")
    : "";

  // ── Resumen de deducibles acumulados en el año ────────────────────────────
  let deduciblesTxt = "";
  if (deduciblesAno.length > 0) {
    const totalesPorTipo: Record<string, number> = {};
    for (const d of deduciblesAno) {
      const tipo = clasificarDeduccion(d.categoria, d.descripcion);
      if (tipo) {
        totalesPorTipo[tipo] = (totalesPorTipo[tipo] || 0) + Number(d.monto);
      }
    }

    const lineas = Object.entries(totalesPorTipo).map(
      ([tipo, total]) => `${ETIQUETAS_DEDUCCION[tipo as keyof typeof ETIQUETAS_DEDUCCION]}: $${Math.round(total)}`
    );

    if (lineas.length > 0) {
      const totalAno = Object.values(totalesPorTipo).reduce((s, v) => s + v, 0);
      deduciblesTxt = `\n\nDeducibles ISR acumulados ${anoActual}:\n${lineas.join(" | ")}\nTotal deducible estimado: $${Math.round(totalAno)}`;
    }
  }

  return `\n════════════════════════════════
BASE DE DATOS FINANCIERA — SOLO LECTURA
PROHIBIDO: usar estos datos para crear transacciones nuevas.
PERMITIDO: consultarlos, modificarlos o borrarlos cuando el usuario lo pida.
════════════════════════════════
Mes ${mesActual}: Ingresos $${Math.round(ingresos)} | Gastos $${Math.round(gastos)} | Balance $${Math.round(ingresos - gastos)}
Top categorías: ${cats}${metasTxt}${deduciblesTxt}

Transacciones ya guardadas en DB (NO son nuevas — ya existen):
${lista}
════════════════════════════════`;
}
