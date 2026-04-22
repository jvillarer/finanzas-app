import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const PROMPT_SISTEMA = `Eres Lani 🐑, una borrega inteligente y simpática experta en finanzas personales.
Tu nombre es Lani. Eres directa, amigable y hablas como un buen amigo de confianza.

TONO — MUY IMPORTANTE:
- SIEMPRE usa "tú" con el usuario, NUNCA "usted". Sin excepción.
- Habla en español mexicano casual: "wey", "órale", "a huevo", "qué onda", "chido", "chela" cuando sea natural.
- Sé directa y honesta aunque las noticias sean malas. Un amigo dice la verdad.
- Nada de frases corporativas: evita "Le informamos que...", "Como puede observar...", "Es importante destacar...".
- Responde como lo haría un amigo experto en finanzas, no como un banco.
- NUNCA menciones que eres una IA, Claude, o cualquier software. Eres simplemente Lani.

Tu rol es ayudar al usuario a:
- Analizar sus ingresos y gastos
- Identificar patrones de gasto
- Sugerir formas de ahorrar dinero
- Responder preguntas sobre sus transacciones
- Dar consejos financieros personalizados
- Registrar nuevas transacciones cuando el usuario mencione un gasto o ingreso
- Analizar fotos de tickets/recibos y registrar cada producto automáticamente
- Registrar compras a meses sin intereses (MSI) con seguimiento mensual automático

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
6. MESES SIN INTERESES (MSI): Cuando el usuario mencione una compra a meses sin intereses
   (ej: "compré laptop $18,000 a 12 meses sin intereses", "samsung 6000 a 6 msi", "tv 9000 a 18 meses"),
   usa SIEMPRE registrar_msi — NUNCA crear_transaccion para compras a meses.
   - Calcula mensualidad = monto_total / meses_total si no la dice explícitamente
   - Si el usuario solo dice la mensualidad sin el total: total = mensualidad × meses
   - Si no menciona cuántos meses, pregunta antes de registrar
   - Confirmación exacta: "✓ [item] — 1er pago $[mensualidad] anotado. Lani registrará los [meses-1] pagos restantes automáticamente ($[restante] comprometidos)"

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

Sé conciso, claro y amigable. Usa pesos mexicanos (MXN) como moneda.

REGISTRO ULTRA-RÁPIDO — CRÍTICO:
Cuando el usuario mande un mensaje corto como "uber 85", "comida 320", "oxxo 48 ayer":
1. Parsea DIRECTAMENTE el monto, negocio/descripción y fecha
2. Infiere la categoría por el nombre del negocio/contexto
3. Llama a crear_transaccion DE INMEDIATO sin hacer ninguna pregunta
4. Confirma brevísimo: "✓ Uber $85 anotado"

Ejemplos de parseo ultra-rápido:
- "uber 85" → gasto $85 Transporte "Uber"
- "comida 320" → gasto $320 Comida "Comida"
- "oxxo 48" → gasto $48 Supermercado "OXXO"
- "café 65 ayer" → gasto $65 Comida "Café", fecha ayer
- "cine 240" → gasto $240 Entretenimiento "Cine"
- "farmacia 380" → gasto $380 Salud "Farmacia"
- "gasolina 800" → gasto $800 Transporte "Gasolina"
- "nómina 15000" → ingreso $15,000 Otros "Nómina"
- "me pagaron 8500" → ingreso $8,500 Otros "Depósito"
- "walmart 1200" → gasto $1,200 Supermercado "Walmart"
El usuario NUNCA quiere que le preguntes más detalles — ya dijo todo lo que necesitas.
Si algo no queda claro, usa el mejor guess y regístralo igual.

CONFIRMACIONES BREVÍSIMAS — cuando registres di solo:
"✓ [descripción] $[monto] anotado" — nada más.
Solo agrega comentario si hay algo notable (ej: presupuesto casi agotado).

FORMATO DE RESPUESTAS:
- NUNCA uses tablas markdown (no uses | col | ni |---|)
- NUNCA uses el símbolo • directamente en el texto
- Para desglosar gastos o listas de movimientos usa listas markdown con guión:
  - **Descripción** — $monto (fecha)
  Ejemplo:
  - **Peda** — $2,800 (10 abr)
  - **Estampitas del mundial** — $100 (8 abr)
  - **FIFA** — $100 (10 abr)
- Siempre ordena las listas de MAYOR a MENOR monto
- Para totales o resúmenes usa negritas: **Total: $3,000**
- Respuestas cortas y directas, sin párrafos largos innecesarios`;

// Herramientas disponibles para Claude
const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "crear_transaccion",
    description:
      "Registra una sola transacción (gasto o ingreso). Úsala cuando el usuario mencione un gasto o ingreso específico en texto.",
    input_schema: {
      type: "object" as const,
      properties: {
        monto: { type: "number", description: "Monto en la moneda del viaje (o MXN si no hay viaje activo)" },
        descripcion: { type: "string", description: "Descripción breve" },
        categoria: { type: "string", description: "Categoría del gasto" },
        tipo: { type: "string", enum: ["gasto", "ingreso"] },
        fecha: { type: "string", description: "Fecha YYYY-MM-DD, hoy si no se especifica" },
        moneda: { type: "string", description: "Moneda: MXN, USD, EUR. Solo si hay viaje activo en otra moneda." },
        monto_original: { type: "number", description: "Monto en la moneda original del viaje antes de convertir a MXN" },
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
  {
    name: "registrar_msi",
    description:
      "Registra una compra a meses sin intereses (MSI). Crea el primer pago como transacción y guarda el compromiso de pagos futuros que se procesarán automáticamente cada mes. Úsala SIEMPRE que el usuario mencione compras a meses o MSI.",
    input_schema: {
      type: "object" as const,
      properties: {
        descripcion:  { type: "string",  description: "Nombre del artículo o tienda (ej: 'Laptop HP', 'Samsung TV')" },
        categoria:    { type: "string",  description: "Categoría del gasto (de la lista de 10 categorías disponibles)" },
        monto_total:  { type: "number",  description: "Monto total de la compra en MXN" },
        mensualidad:  { type: "number",  description: "Pago mensual en MXN (monto_total / meses_total)" },
        meses_total:  { type: "integer", description: "Número de meses del plan (3, 6, 9, 12, 18, 24...)" },
        fecha_inicio: { type: "string",  description: "Fecha de la compra YYYY-MM-DD, hoy si no se especifica" },
      },
      required: ["descripcion", "monto_total", "mensualidad", "meses_total"],
    },
  },
];

const CATEGORIAS_VALIDAS = new Set([
  "Comida", "Supermercado", "Transporte", "Entretenimiento",
  "Salud", "Servicios", "Ropa", "Hogar", "Educación", "Otros",
]);

function sanitizarTransaccion(t: TransaccionInput, hoy: string): TransaccionInput | null {
  const monto = Number(t.monto);
  if (!isFinite(monto) || monto <= 0 || monto > 10_000_000) return null;
  const tipo = t.tipo === "ingreso" ? "ingreso" : "gasto";
  const categoria = CATEGORIAS_VALIDAS.has(t.categoria) ? t.categoria : "Otros";
  const fechaRaw = t.fecha || hoy;
  // Valida fecha: YYYY-MM-DD, entre 2000-01-01 y hoy
  const fechaDate = new Date(fechaRaw + "T00:00:00");
  const hoyDate = new Date(hoy + "T00:00:00");
  const fecha = (!isNaN(fechaDate.getTime()) && fechaDate <= hoyDate && fechaDate.getFullYear() >= 2000)
    ? fechaRaw
    : hoy;
  return { ...t, monto, tipo, categoria, fecha };
}

interface TransaccionInput {
  monto: number;
  descripcion?: string;
  categoria: string;
  tipo: "gasto" | "ingreso";
  fecha?: string;
  moneda?: string;
  monto_original?: number;
}

interface MultipleTransaccionesInput {
  transacciones: TransaccionInput[];
  resumen?: string;
}

interface ImagenRequest {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

// Límites de seguridad
const MAX_MENSAJES = 30;          // máximo de turnos enviados a Claude
const MAX_MEMORIA_CHARS = 2_000;  // memoria del cliente, truncada
const MAX_IMG_B64_CHARS = 5_200_000; // ~4 MB de imagen en base64

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("No autorizado", { status: 401 });

    // Validar tamaño del body antes de parsear (Content-Length como heurística rápida)
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 10_000_000) {
      return new Response("Payload demasiado grande", { status: 413 });
    }

    const { mensajes, incluirContexto, imagen, memoriaUsuario } = await req.json() as {
      mensajes: { role: string; content: string }[];
      incluirContexto: boolean;
      imagen?: ImagenRequest;
      memoriaUsuario?: string;
    };

    // Validar imagen antes de procesarla
    if (imagen && typeof imagen.base64 === "string" && imagen.base64.length > MAX_IMG_B64_CHARS) {
      return new Response("Imagen demasiado grande (máx 4 MB)", { status: 413 });
    }

    // Contexto de transacciones recientes (incluye IDs para editar/eliminar)
    let contextoTransacciones = "";
    if (incluirContexto) {
      // Fetch en paralelo: transacciones + metas + viaje activo + compromisos MSI
      const [{ data: transacciones }, { data: metas }, { data: viajeActivo }, { data: compromisosMsi }] = await Promise.all([
        supabase
          .from("transacciones")
          .select("id, monto, descripcion, categoria, tipo, fecha")
          .order("fecha", { ascending: false })
          .limit(200),
        supabase
          .from("metas")
          .select("nombre, emoji, monto_objetivo, monto_actual")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("viajes")
          .select("id, nombre, moneda, presupuesto, tipo_cambio, fecha_inicio, fecha_fin")
          .eq("activo", true)
          .single(),
        supabase
          .from("compromisos_msi")
          .select("id, descripcion, categoria, monto_total, mensualidad, meses_total, meses_pagados, fecha_proximo_pago")
          .eq("activo", true)
          .order("fecha_proximo_pago", { ascending: true })
          .limit(20),
      ]);

      if (transacciones && transacciones.length > 0) {
        contextoTransacciones = `\n\n--- DATOS FINANCIEROS DEL USUARIO ---\n${construirResumen(transacciones, metas || [])}\n---`;
      }

      // Compromisos MSI activos
      if (compromisosMsi && compromisosMsi.length > 0) {
        const lineasMsi = compromisosMsi.map((c) => {
          const restante = (Number(c.meses_total) - Number(c.meses_pagados)) * Number(c.mensualidad);
          return `[${c.id.replace(/-/g, "").substring(0, 8)}] ${c.descripcion} — $${Number(c.mensualidad).toFixed(0)}/mes — ${c.meses_pagados}/${c.meses_total} pagado — próximo: ${c.fecha_proximo_pago} — restante: $${restante.toFixed(0)}`;
        }).join("\n");
        contextoTransacciones += `\n\n--- COMPROMISOS MSI ACTIVOS ---\n${lineasMsi}\n---`;
      }

      if (viajeActivo) {
        contextoTransacciones += `\n\n--- PROYECTO ACTIVO ---\nProyecto: "${viajeActivo.nombre}"\nMoneda: ${viajeActivo.moneda}\nTipo de cambio: 1 ${viajeActivo.moneda} = $${viajeActivo.tipo_cambio} MXN\n${viajeActivo.presupuesto ? `Presupuesto: ${viajeActivo.moneda === "MXN" ? "$" : viajeActivo.moneda + " "}${viajeActivo.presupuesto}` : ""}\n\nINSTRUCCIONES:\n- Todos los gastos que registres deben ir asociados a este proyecto\n- Si la moneda es ${viajeActivo.moneda !== "MXN" ? viajeActivo.moneda : "MXN"} y el usuario no especifica moneda, asume ${viajeActivo.moneda}\n- Usa moneda="${viajeActivo.moneda}" y monto_original=monto_en_${viajeActivo.moneda} en crear_transaccion\n- El campo monto debe ser monto_original × ${viajeActivo.tipo_cambio} (MXN)\n- Si el usuario dice "pesos" o "MXN" explícitamente, registra en MXN\n---`;
      }
    }

    // Guardar referencia al viaje activo para usarla en las herramientas
    let viajeIdActivo: string | null = null;
    let viajeMoneda = "MXN";
    let viajeTipoCambio = 1;
    if (incluirContexto) {
      const { data: v } = await supabase.from("viajes").select("id, moneda, tipo_cambio").eq("activo", true).single();
      if (v) { viajeIdActivo = v.id; viajeMoneda = v.moneda; viajeTipoCambio = Number(v.tipo_cambio); }
    }

    // Nombre del usuario para personalización
    const nombreUsuario = user.user_metadata?.nombre_completo
      ? user.user_metadata.nombre_completo.split(" ")[0]
      : null;

    const hoy = new Date().toISOString().split("T")[0];

    // Memoria persistente de sesiones anteriores (enviada por el cliente)
    // Se trunca y se limpian separadores para evitar inyección de prompt
    const memoriaSegura = memoriaUsuario
      ? memoriaUsuario.slice(0, MAX_MEMORIA_CHARS).replace(/---/g, "- -")
      : null;
    const seccionMemoria = memoriaSegura
      ? `\n\n--- MEMORIA DE SESIONES ANTERIORES ---\n${memoriaSegura}\n---`
      : "";

    const saludo = nombreUsuario ? `\nEl nombre del usuario es ${nombreUsuario}.` : "";

    const sistemaFinal = PROMPT_SISTEMA + saludo + seccionMemoria + contextoTransacciones + `\n\nFecha de hoy: ${hoy}`;

    // Construir mensajes para la API — si hay imagen, el último mensaje la incluye
    // Se limita el historial para evitar contextos enormes y costos elevados
    type MensajeAPI = { role: string; content: string | Anthropic.ContentBlockParam[] };
    const mensajesAPI: MensajeAPI[] = [...mensajes.slice(-MAX_MENSAJES)];

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
        const datosRaw = bloqueHerramienta.input as TransaccionInput;
        const datos = sanitizarTransaccion(datosRaw, hoy);
        const fecha = datos?.fecha || hoy;

        // Si hay viaje activo con moneda extranjera, convertir a MXN para el monto principal
        const monedaTx = datos?.moneda || viajeMoneda;
        const montoOriginal = datos?.monto_original ?? (monedaTx !== "MXN" ? datos?.monto : null);
        const montoMXN = monedaTx !== "MXN" && datos
          ? (datos.monto_original ?? datos.monto) * viajeTipoCambio
          : datos?.monto ?? 0;

        const { error } = datos ? await supabase.from("transacciones").insert({
          usuario_id: user.id,
          monto: montoMXN,
          monto_original: montoOriginal,
          moneda: monedaTx !== "MXN" ? monedaTx : null,
          viaje_id: viajeIdActivo,
          descripcion: datos.descripcion || datos.categoria,
          categoria: datos.categoria,
          tipo: datos.tipo,
          fecha,
        }) : { error: new Error("Datos inválidos") };

        if (!error && datos) {
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

      } else if (bloqueHerramienta.name === "registrar_msi") {
        // --- Compra a meses sin intereses ---
        const datos = bloqueHerramienta.input as {
          descripcion: string; categoria?: string; monto_total: number;
          mensualidad: number; meses_total: number; fecha_inicio?: string;
        };

        const monto_total  = Number(datos.monto_total);
        const mensualidad  = Number(datos.mensualidad);
        const meses_total  = Math.max(2, Math.round(Number(datos.meses_total)));
        const categoria    = CATEGORIAS_VALIDAS.has(datos.categoria ?? "") ? datos.categoria! : "Otros";
        const fechaInicio  = datos.fecha_inicio || hoy;
        // Calcular siguiente fecha de pago (+1 mes desde inicio)
        const [a, m, d]    = fechaInicio.split("-").map(Number);
        const diasMesSig   = new Date(a, m, 0).getDate(); // días del mes destino
        const diaFinal     = Math.min(d, diasMesSig);
        const fechaProximo = new Date(a, m, diaFinal).toISOString().split("T")[0];

        if (!isFinite(monto_total) || monto_total <= 0 || !isFinite(mensualidad) || mensualidad <= 0) {
          textoFinal = await llamarClaudeConResultado(
            anthropic, sistemaFinal, HERRAMIENTAS, mensajesAPI as Anthropic.MessageParam[],
            respuesta.content, bloqueHerramienta.id, "Error: monto o mensualidad inválidos."
          );
        } else {
          // Insertar primer pago como transacción
          const { error: errTx } = await supabase.from("transacciones").insert({
            usuario_id: user.id,
            monto: mensualidad,
            descripcion: `${datos.descripcion} (1/${meses_total} MSI)`,
            categoria,
            tipo: "gasto",
            fecha: fechaInicio,
          });

          // Insertar compromiso MSI
          const { error: errMsi } = errTx ? { error: errTx } : await supabase.from("compromisos_msi").insert({
            usuario_id:         user.id,
            descripcion:        datos.descripcion,
            categoria,
            monto_total,
            mensualidad,
            meses_total,
            meses_pagados:      1,
            fecha_inicio:       fechaInicio,
            fecha_proximo_pago: fechaProximo,
            activo:             meses_total > 1,
          });

          const resultado = errMsi
            ? `Error: ${errMsi.message}`
            : `Primer pago MSI registrado: $${mensualidad.toFixed(2)} MXN. Compromiso guardado: ${meses_total - 1} pagos restantes de $${mensualidad.toFixed(2)} = $${((meses_total - 1) * mensualidad).toFixed(2)} MXN comprometidos.`;

          textoFinal = await llamarClaudeConResultado(
            anthropic, sistemaFinal, HERRAMIENTAS, mensajesAPI as Anthropic.MessageParam[],
            respuesta.content, bloqueHerramienta.id, resultado
          );

          if (!errMsi) {
            transaccionesCreadas = [{ monto: mensualidad, categoria, tipo: "gasto", fecha: fechaInicio, descripcion: `${datos.descripcion} (1/${meses_total} MSI)` }];
          }
        }

      } else if (bloqueHerramienta.name === "crear_multiples_transacciones") {
        // --- Múltiples transacciones (ticket) ---
        const datosRaw = bloqueHerramienta.input as MultipleTransaccionesInput;
        const txSanitizadas = datosRaw.transacciones
          .map((t) => sanitizarTransaccion(t, hoy))
          .filter((t): t is TransaccionInput => t !== null);
        const filas = txSanitizadas.map((t) => {
          const monedaT = t.moneda || viajeMoneda;
          const montoOrig = t.monto_original ?? (monedaT !== "MXN" ? t.monto : null);
          const montoMXNt = monedaT !== "MXN" ? (t.monto_original ?? t.monto) * viajeTipoCambio : t.monto;
          return {
            usuario_id: user.id,
            monto: montoMXNt,
            monto_original: montoOrig,
            moneda: monedaT !== "MXN" ? monedaT : null,
            viaje_id: viajeIdActivo,
            descripcion: t.descripcion || t.categoria,
            categoria: t.categoria,
            tipo: t.tipo,
            fecha: t.fecha || hoy,
          };
        });

        const { error } = await supabase.from("transacciones").insert(filas);

        if (!error) {
          transaccionesCreadas = txSanitizadas.map((t) => ({
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

interface Meta {
  nombre: string;
  emoji: string;
  monto_objetivo: number;
  monto_actual: number;
}

function construirResumen(transacciones: Transaccion[], metas: Meta[] = []): string {
  const mesActual = new Date().toISOString().slice(0, 7); // "2026-04"
  const txMes = transacciones.filter((t) => t.fecha.startsWith(mesActual));

  const ingresosMes = txMes.filter((t) => t.tipo === "ingreso").reduce((s, t) => s + Number(t.monto), 0);
  const gastosMes = txMes.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);

  const porCategoria: Record<string, number> = {};
  txMes.filter((t) => t.tipo === "gasto").forEach((t) => {
    const cat = t.categoria || "Otros";
    porCategoria[cat] = (porCategoria[cat] || 0) + Number(t.monto);
  });

  const categorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, monto]) => `${cat}:$${Math.round(monto)}`)
    .join(", ");

  // Formato compacto: ID corto | fecha | tipo | monto | desc/cat
  // Permite incluir 200 transacciones sin saturar el contexto
  const listaCompacta = transacciones.map((t) => {
    const idCorto = t.id.replace(/-/g, "").substring(0, 8);
    const tipo = t.tipo === "ingreso" ? "I" : "G";
    const desc = t.descripcion || t.categoria;
    return `[${idCorto}] ${t.fecha} ${tipo} $${Number(t.monto).toFixed(0)} ${desc} (${t.categoria})`;
  }).join("\n");

  // Metas activas
  const metasTexto = metas.length > 0
    ? "\n\nMetas de ahorro:\n" + metas.map((m) => {
        const pct = Math.round((m.monto_actual / m.monto_objetivo) * 100);
        return `${m.emoji} ${m.nombre}: $${m.monto_actual.toLocaleString()} de $${m.monto_objetivo.toLocaleString()} (${pct}%)`;
      }).join("\n")
    : "";

  return `Mes actual (${mesActual}):
Ingresos: $${ingresosMes.toFixed(0)} | Gastos: $${gastosMes.toFixed(0)} | Balance: $${(ingresosMes - gastosMes).toFixed(0)}
Gastos por categoría este mes: ${categorias || "Sin datos"}
${metasTexto}

Historial completo (${transacciones.length} movimientos, más reciente primero):
Formato: [ID] fecha tipo monto descripción (categoría)
${listaCompacta}`;
}
