import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { enviarMensajeWA, marcarLeidoWA } from "@/lib/whatsapp";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Supabase admin para buscar usuarios por teléfono
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

  // Si no hay mensaje (puede ser una notificación de status), responder OK
  if (!mensaje) return Response.json({ ok: true });

  const telefonoRaw = mensaje.from as string;
  console.log("📱 Teléfono recibido de Meta:", telefonoRaw);
  // Meta envía números mexicanos como 521XXXXXXXXXX, normalizamos a 52XXXXXXXXXX
  const telefono = telefonoRaw.startsWith("521") && telefonoRaw.length === 13
    ? "52" + telefonoRaw.slice(3)
    : telefonoRaw;
  const messageId = mensaje.id as string;
  const texto     = (mensaje.text?.body ?? "") as string;
  const tipo      = mensaje.type as string;

  // Solo procesar mensajes de texto por ahora (ignorar stickers, audio, etc.)
  if (tipo !== "text" || !texto.trim()) {
    await enviarMensajeWA(telefono, "Solo puedo leer mensajes de texto por el momento 🐑");
    return Response.json({ ok: true });
  }

  // Marcar como leído inmediatamente
  await marcarLeidoWA(messageId);

  // Buscar el usuario vinculado a este número
  const supabase = supabaseAdmin();
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
      "1. Abre lani.app\n" +
      "2. Ve a Perfil\n" +
      "3. Escribe tu número de WhatsApp\n\n" +
      "¡Y listo! Ya podremos hablar por aquí."
    );
    return Response.json({ ok: true });
  }

  const usuarioId = perfil.id as string;
  const nombre    = (perfil.nombre_completo as string ?? "").split(" ")[0];
  const hoy       = new Date().toISOString().split("T")[0];

  // Obtener contexto financiero del usuario
  const [{ data: transacciones }, { data: metas }] = await Promise.all([
    supabase
      .from("transacciones")
      .select("id, monto, descripcion, categoria, tipo, fecha")
      .eq("usuario_id", usuarioId)
      .order("fecha", { ascending: false })
      .limit(150),
    supabase
      .from("metas")
      .select("nombre, emoji, monto_objetivo, monto_actual")
      .eq("usuario_id", usuarioId)
      .limit(5),
  ]);

  const contexto = construirContextoWA(transacciones ?? [], metas ?? []);

  // Prompt de Lani adaptado para WhatsApp (sin markdown complejo)
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
- Confirma en una línea: "✓ Uber $85 anotado"
- Sin preguntas, sin confirmaciones previas

REGLAS:
1. Registra cualquier gasto/ingreso mencionado sin pedir confirmación
2. Si pide info financiera, responde con datos reales del contexto
3. Si pide modificar o borrar una transacción, hazlo con la herramienta correcta
4. Nunca menciones que eres IA o Claude

Categorías válidas: Comida, Supermercado, Transporte, Entretenimiento, Salud, Servicios, Ropa, Hogar, Educación, Otros

${contexto}`;

  // Herramientas disponibles (mismo esquema que el chat)
  const herramientas: Anthropic.Tool[] = [
    {
      name: "crear_transaccion",
      description: "Registra un gasto o ingreso",
      input_schema: {
        type: "object" as const,
        properties: {
          monto:       { type: "number",  description: "Monto en pesos MXN" },
          descripcion: { type: "string",  description: "Descripción breve" },
          categoria:   { type: "string",  description: "Categoría" },
          tipo:        { type: "string",  enum: ["gasto", "ingreso"] },
          fecha:       { type: "string",  description: "Fecha YYYY-MM-DD" },
        },
        required: ["monto", "tipo", "categoria"],
      },
    },
    {
      name: "actualizar_transaccion",
      description: "Modifica una transacción existente",
      input_schema: {
        type: "object" as const,
        properties: {
          id:          { type: "string" },
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
      description: "Elimina una transacción",
      input_schema: {
        type: "object" as const,
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
    },
  ];

  const CATEGORIAS_VALIDAS = new Set([
    "Comida", "Supermercado", "Transporte", "Entretenimiento",
    "Salud", "Servicios", "Ropa", "Hogar", "Educación", "Otros",
  ]);

  // Primera llamada a Claude
  const respuesta = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    system: sistemaWA,
    tools: herramientas,
    messages: [{ role: "user", content: texto }],
  });

  let textoFinal = "";

  if (respuesta.stop_reason === "tool_use") {
    const bloque = respuesta.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock;

    if (bloque.name === "crear_transaccion") {
      const d = bloque.input as { monto: number; descripcion?: string; categoria: string; tipo: string; fecha?: string };
      const monto    = Math.abs(Number(d.monto));
      const tipo     = d.tipo === "ingreso" ? "ingreso" : "gasto";
      const categoria = CATEGORIAS_VALIDAS.has(d.categoria) ? d.categoria : "Otros";
      const fecha    = d.fecha || hoy;

      const { error } = await supabase.from("transacciones").insert({
        usuario_id:  usuarioId,
        monto,
        descripcion: d.descripcion || categoria,
        categoria,
        tipo,
        fecha,
      });

      const resultado = error ? `Error: ${error.message}` : "Transacción guardada.";
      textoFinal = await segundaLlamadaClaude(anthropic, sistemaWA, herramientas,
        [{ role: "user", content: texto }], respuesta.content, bloque.id, resultado);

    } else if (bloque.name === "actualizar_transaccion") {
      const d = bloque.input as { id: string; fecha?: string; monto?: number; descripcion?: string; categoria?: string; tipo?: string };
      const cambios: Record<string, unknown> = {};
      if (d.fecha) cambios.fecha = d.fecha;
      if (d.monto) cambios.monto = d.monto;
      if (d.descripcion) cambios.descripcion = d.descripcion;
      if (d.categoria) cambios.categoria = d.categoria;
      if (d.tipo) cambios.tipo = d.tipo;

      const { error } = await supabase.from("transacciones")
        .update(cambios).eq("id", d.id).eq("usuario_id", usuarioId);

      const resultado = error ? `Error: ${error.message}` : "Transacción actualizada.";
      textoFinal = await segundaLlamadaClaude(anthropic, sistemaWA, herramientas,
        [{ role: "user", content: texto }], respuesta.content, bloque.id, resultado);

    } else if (bloque.name === "eliminar_transaccion") {
      const d = bloque.input as { id: string };
      const { error } = await supabase.from("transacciones")
        .delete().eq("id", d.id).eq("usuario_id", usuarioId);

      const resultado = error ? `Error: ${error.message}` : "Transacción eliminada.";
      textoFinal = await segundaLlamadaClaude(anthropic, sistemaWA, herramientas,
        [{ role: "user", content: texto }], respuesta.content, bloque.id, resultado);
    }
  } else {
    textoFinal = (respuesta.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text ?? "";
  }

  // Enviar respuesta al usuario por WhatsApp
  if (textoFinal) {
    await enviarMensajeWA(telefono, textoFinal);
  }

  return Response.json({ ok: true });
}

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
    model: "claude-opus-4-5",
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

// Resumen financiero compacto para el contexto de WhatsApp
function construirContextoWA(
  transacciones: { id: string; monto: number; descripcion: string; categoria: string; tipo: string; fecha: string }[],
  metas: { nombre: string; emoji: string; monto_objetivo: number; monto_actual: number }[]
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

  const lista = transacciones.slice(0, 100).map((t) => {
    const idCorto = t.id.replace(/-/g, "").substring(0, 8);
    return `[${idCorto}] ${t.fecha} ${t.tipo === "ingreso" ? "I" : "G"} $${Number(t.monto).toFixed(0)} ${t.descripcion} (${t.categoria})`;
  }).join("\n");

  const metasTxt = metas.length
    ? "\nMetas: " + metas.map((m) => `${m.emoji}${m.nombre} ${Math.round(m.monto_actual / m.monto_objetivo * 100)}%`).join(", ")
    : "";

  return `\n--- FINANZAS ---\nMes ${mesActual}: Ingresos $${Math.round(ingresos)} | Gastos $${Math.round(gastos)} | Balance $${Math.round(ingresos - gastos)}\nTop categorías: ${cats}${metasTxt}\n\nÚltimas transacciones:\n${lista}\n---`;
}
