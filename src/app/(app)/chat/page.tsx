"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import TourSheet, { TourBoton } from "@/components/TourSheet";

interface Mensaje {
  rol: "user" | "assistant";
  contenido: string;
  imagenUrl?: string;
}

interface TransaccionCreada {
  monto: number; descripcion: string; categoria: string;
  tipo: "gasto" | "ingreso"; fecha: string;
}

const SUGERENCIAS = [
  "¿Cuánto gasté este mes?",
  "¿En qué categoría gasto más?",
  "Gasté $500 en comida hoy",
  "Me depositaron $15,000 de nómina",
];

const MENSAJE_BIENVENIDA: Mensaje = {
  rol: "assistant",
  contenido: "¡Qué onda! 🐑 Soy Lani. Cuéntame tus gastos e ingresos y los anoto al momento. También puedo leer fotos de tickets si me mandas una.\n\n¿Qué pasó hoy?",
};

const STORAGE_KEY = "lani_chat_mensajes";
const MEMORIA_KEY = "lani_memoria";
const CLAVE_ULTIMO_PDF = "lani_ultimo_pdf";
const CLAVE_ULTIMA_ACTIVIDAD = "lani_ultima_actividad";

// ── Nudge contextual: sugiere acciones según contexto temporal ──
interface NudgeDatos {
  emoji: string;
  titulo: string;
  subtitulo: string;
  accion?: string;
  accionLabel?: string;
  sugerencia?: string;
}

function calcularNudge(): NudgeDatos | null {
  try {
    const ahora = new Date();
    const hora = ahora.getHours();
    const diaSemana = ahora.getDay(); // 0=Dom, 6=Sáb
    const dia = ahora.getDate();
    const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
    const diasRestantes = ultimoDia - dia;

    // 1. Recordatorio quincenal de PDF
    const ultimoPDF = localStorage.getItem(CLAVE_ULTIMO_PDF);
    const diasDesdePDF = ultimoPDF
      ? Math.floor((ahora.getTime() - new Date(ultimoPDF).getTime()) / 86400000)
      : 999;

    if (diasDesdePDF >= 15) {
      return {
        emoji: "📄",
        titulo: diasDesdePDF >= 30 ? "¿Cuándo fue la última vez que importaste tu banco?" : "Ya es quincena de tu estado de cuenta",
        subtitulo: diasDesdePDF < 999
          ? `Llevas ${diasDesdePDF} días sin importar. Lani lo categoriza en segundos.`
          : "Conecta tu banco de una vez. Lani extrae y categoriza todo automáticamente.",
        accion: "/subir-archivo",
        accionLabel: "Subir estado de cuenta",
      };
    }

    // 2. Inactividad prolongada
    const ultimaActividad = localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD);
    const diasSinActividad = ultimaActividad
      ? Math.floor((ahora.getTime() - new Date(ultimaActividad).getTime()) / 86400000)
      : 0;

    if (diasSinActividad >= 3) {
      return {
        emoji: "📊",
        titulo: `Llevas ${diasSinActividad} días sin registrar`,
        subtitulo: "¿Qué has gastado? Dime algo corto tipo 'uber 85' o 'comida 320'.",
        sugerencia: diasSinActividad >= 5 ? `¿Qué gasté estos ${diasSinActividad} días?` : "¿Qué gasté desde el " + new Date(Date.now() - diasSinActividad * 86400000).toLocaleDateString("es-MX", { weekday: "long" }) + "?",
      };
    }

    // 3. Contextual por día y hora
    // Lunes por la mañana → revisión del fin de semana
    if (diaSemana === 1 && hora < 14) {
      return {
        emoji: "☕",
        titulo: "¿Cómo quedó el fin de semana?",
        subtitulo: "Cuéntame qué gastaste. Puedes decir algo como 'resto sábado 800'.",
        sugerencia: "¿Cuánto gasté el fin de semana?",
      };
    }

    // Hora de comida
    if (hora >= 12 && hora < 15) {
      return {
        emoji: "🍽",
        titulo: "¿Ya comiste? ¿Cuánto te salió?",
        subtitulo: "Di algo como 'comida 180' y lo anoto al tiro.",
        sugerencia: "comida ",
      };
    }

    // Noche → resumen del día
    if (hora >= 20) {
      return {
        emoji: "🌙",
        titulo: "¿Cómo te fue hoy en gastos?",
        subtitulo: "Buen momento para anotar lo de hoy antes de que se te olvide.",
        sugerencia: "¿Cuánto gasté hoy?",
      };
    }

    // Fin de mes
    if (diasRestantes <= 3) {
      return {
        emoji: "📅",
        titulo: `Quedan ${diasRestantes === 0 ? "pocas horas" : diasRestantes + " días"} del mes`,
        subtitulo: "¿Todo anotado? Revisemos cómo quedó el mes.",
        sugerencia: "¿Cómo quedó el mes?",
      };
    }

    // Quincena (día 15 o primer día del mes)
    if (dia === 15 || dia === 1) {
      return {
        emoji: "💰",
        titulo: dia === 15 ? "¡Mitad de mes!" : "¡Primer día del mes!",
        subtitulo: "¿Ya te cayó la quincena? ¿Cómo vas con el presupuesto?",
        sugerencia: dia === 15 ? "¿Cómo voy a la mitad del mes?" : "¿Cuánto gasté el mes pasado?",
      };
    }
  } catch { /* ok */ }

  return null;
}

// ── Componente de nudge contextual ──
function NudgeContextual({ nudge, onEnviar, onNavegar }: {
  nudge: NudgeDatos;
  onEnviar: (texto: string) => void;
  onNavegar: (url: string) => void;
}) {
  return (
    <div
      className="mx-2 mb-3 rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(15,47,47,0.08)", backgroundColor: "#EFECE5", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
    >
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: "#f5f3ee" }}
          >
            {nudge.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-snug">{nudge.titulo}</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#6b7280" }}>{nudge.subtitulo}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {nudge.accion && (
            <button
              onClick={() => onNavegar(nudge.accion!)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#0c0c0e", color: "#fff" }}
            >
              {nudge.accionLabel || "Ver"}
            </button>
          )}
          {nudge.sugerencia && (
            <button
              onClick={() => onEnviar(nudge.sugerencia!)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              style={{ backgroundColor: nudge.accion ? "#EFECE5" : "#0c0c0e", color: nudge.accion ? "#0F2F2F" : "#fff" }}
            >
              {nudge.sugerencia.length > 28 ? nudge.sugerencia.slice(0, 26) + "…" : nudge.sugerencia}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function cargarMensajes(): Mensaje[] {
  try {
    const guardados = localStorage.getItem(STORAGE_KEY);
    if (guardados) {
      const parsed = JSON.parse(guardados) as Mensaje[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ok */ }
  return [MENSAJE_BIENVENIDA];
}

function cargarMemoria(): string {
  try { return localStorage.getItem(MEMORIA_KEY) || ""; } catch { return ""; }
}

// Actualiza la memoria persistente con info de transacciones creadas en esta sesión
function actualizarMemoria(transacciones: TransaccionCreada[]) {
  try {
    const anterior = localStorage.getItem(MEMORIA_KEY) || "";
    const lineasAnteriores = anterior.split("\n").filter(Boolean).slice(-20); // máx 20 líneas de memoria
    const nuevasLineas = transacciones.map((t) => {
      const tipo = t.tipo === "gasto" ? "gasto" : "ingreso";
      return `- Registré ${tipo} $${t.monto} en ${t.categoria}: "${t.descripcion}" (${t.fecha})`;
    });
    const memoria = [...lineasAnteriores, ...nuevasLineas].join("\n");
    localStorage.setItem(MEMORIA_KEY, memoria);
    // Actualizar timestamp de última actividad
    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, new Date().toISOString());
  } catch { /* ok */ }
}

export default function ChatPage() {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>([MENSAJE_BIENVENIDA]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ultimoMensajeFallido, setUltimoMensajeFallido] = useState<string>("");
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [imagenPendiente, setImagenPendiente] = useState<{
    base64: string; mediaType: string; previewUrl: string;
  } | null>(null);
  const [nudge, setNudge] = useState<NudgeDatos | null>(null);
  const [showTour, setShowTour] = useState(false);
  const memoriaRef = useRef<string>("");

  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputImagenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Cargar conversación y memoria guardadas al montar
    setMensajes(cargarMensajes());
    memoriaRef.current = cargarMemoria();
    // Calcular nudge contextual
    setNudge(calcularNudge());
  }, []);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
    // Guardar conversación en localStorage (sin imágenes para no saturar)
    try {
      const sinImagenes = mensajes.map((m) => ({ ...m, imagenUrl: undefined }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sinImagenes));
    } catch { /* ok si está lleno */ }
  }, [mensajes]);

  useEffect(() => {
    if (notificacion) {
      const t = setTimeout(() => setNotificacion(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notificacion]);

  // ── Imagen ──
  const comprimirImagen = (archivo: File): Promise<{ base64: string; previewUrl: string }> =>
    new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(archivo);
      img.onload = () => {
        const MAX = 1200;
        const escala = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        URL.revokeObjectURL(url);
        resolve({ base64: dataUrl.split(",")[1], previewUrl: dataUrl });
      };
      img.src = url;
    });

  const manejarImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    e.target.value = "";
    const { base64, previewUrl } = await comprimirImagen(archivo);
    setImagenPendiente({ base64, mediaType: "image/jpeg", previewUrl });
  };

  // ── Enviar ──
  const enviar = async (texto?: string) => {
    const pregunta = (texto ?? input).trim();
    if (!pregunta && !imagenPendiente) return;
    if (cargando) return;

    const textoFinal = pregunta || "Analiza este ticket y registra cada producto";
    setInput("");
    setError("");
    setUltimoMensajeFallido("");

    const nuevosMensajes: Mensaje[] = [
      ...mensajes,
      { rol: "user", contenido: textoFinal, imagenUrl: imagenPendiente?.previewUrl },
    ];
    setMensajes(nuevosMensajes);
    const imagenParaEnviar = imagenPendiente;
    setImagenPendiente(null);
    setCargando(true);
    setMensajes((prev) => [...prev, { rol: "assistant", contenido: "" }]);

    try {
      const cuerpo: Record<string, unknown> = {
        mensajes: nuevosMensajes.map((m) => ({ role: m.rol, content: m.contenido })),
        incluirContexto: true,
        memoriaUsuario: memoriaRef.current || undefined,
      };
      if (imagenParaEnviar) {
        cuerpo.imagen = { base64: imagenParaEnviar.base64, mediaType: imagenParaEnviar.mediaType };
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });

      if (!res.ok) throw new Error("Error del servidor");
      const datos = await res.json();

      setMensajes((prev) => {
        const act = [...prev];
        act[act.length - 1] = { rol: "assistant", contenido: datos.texto };
        return act;
      });

      const creadas: TransaccionCreada[] = datos.transaccionesCreadas || [];
      if (creadas.length > 0) {
        // Actualizar memoria persistente con las nuevas transacciones
        actualizarMemoria(creadas);
        memoriaRef.current = cargarMemoria();
      }
      if (creadas.length === 1) {
        const t = creadas[0];
        const monto = "$" + new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.monto);
        setNotificacion(`✓ ${t.tipo === "gasto" ? "Gasto" : "Ingreso"} registrado: ${monto} · ${t.categoria}`);
      } else if (creadas.length > 1) {
        const total = creadas.reduce((s, t) => s + t.monto, 0);
        const fmt = "$" + new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total);
        setNotificacion(`✓ ${creadas.length} movimientos registrados · ${fmt}`);
      }
    } catch {
      setError("No se pudo enviar. Verifica tu conexión.");
      setUltimoMensajeFallido(textoFinal);
      setMensajes((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.contenido === "")));
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="flex flex-col" style={{ position: "fixed", inset: 0, backgroundColor: "#F5F3EE", overflow: "hidden" }}>

      {/* ── TOUR ── */}
      <TourSheet
        tourKey="lani_tour_chat"
        titulo="Chatea con Lani"
        subtitulo="Tu asistente financiera personal"
        pasos={[
          { icono: "💬", titulo: "Habla natural", desc: "Di 'gasté 200 en tacos' o 'recibí 15,000 de nómina' y Lani lo registra al instante, sin formularios." },
          { icono: "🔍", titulo: "Pregunta lo que sea", desc: "'¿Cuánto llevo en Uber este mes?' · '¿Cuál es mi categoría más cara?' · 'Muéstrame mis gastos de comida'." },
          { icono: "📸", titulo: "Fotos de tickets", desc: "Toca la cámara para mandar una foto de tu ticket y Lani extrae y registra cada producto automáticamente." },
          { icono: "✏️", titulo: "Edita o borra", desc: "Dile 'borra el último gasto' o 'cambia el taxi de ayer a $180' y lo hace sin que toques nada." },
        ]}
        abierto={showTour}
        onCerrar={() => setShowTour(false)}
      />

      {/* ── HEADER ── */}
      <div
        className="shrink-0"
        style={{ backgroundColor: "#0F2F2F", paddingTop: "calc(env(safe-area-inset-top) + 12px)", paddingBottom: 28, position: "relative" }}
      >
        {/* Lani acostada en el borde inferior del header */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lani_chat.png"
          alt="Lani"
          style={{
            position: "absolute",
            bottom: -14,
            left: 16,
            width: 160,
            height: "auto",
            objectFit: "contain",
            zIndex: 10,
            pointerEvents: "none",
          }}
        />

        <div className="flex items-center gap-3 px-4">
          {/* Espacio para Lani (izq) + acciones (der) */}
          <div style={{ width: 160, flexShrink: 0 }} />
          <div className="flex-1" />

          <TourBoton onClick={() => setShowTour(true)} />

          {/* Reiniciar */}
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              setMensajes([MENSAJE_BIENVENIDA]);
            }}
            className="flex items-center gap-1.5 h-8 rounded-2xl transition-all active:scale-95"
            style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", paddingLeft: 12, paddingRight: 12 }}
            title="Nueva conversación"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.08-4.43" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Reiniciar</span>
          </button>
        </div>{/* cierra inner flex items */}
      </div>{/* cierra header shrink-0 */}

      {/* Notificación */}
      {notificacion && (
        <div
          className="mx-4 mt-3 shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold fade-in"
          style={{ backgroundColor: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", color: "#166534" }}
        >
          {notificacion}
        </div>
      )}

      {/* ── MENSAJES ── */}
      <div ref={listaRef} className="flex-1 overflow-y-auto no-scroll" style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 12, paddingBottom: 16 }}>
        {mensajes.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.rol === "user" ? "justify-end" : "justify-start"}`}
            style={{
              paddingLeft: msg.rol === "user" ? 64 : 16,
              paddingRight: msg.rol === "user" ? 16 : 64,
              marginBottom: 10,
            }}
          >
            <div
              className="max-w-full text-sm leading-relaxed"
              style={{
                backgroundColor: msg.rol === "user" ? "#ffffff" : "#0F2F2F",
                border: msg.rol === "user" ? "1px solid rgba(15,47,47,0.08)" : "none",
                color: msg.rol === "user" ? "#0F2F2F" : "#ffffff",
                boxShadow: msg.rol === "user" ? "0 1px 6px rgba(0,0,0,0.08)" : "0 2px 8px rgba(15,47,47,0.15)",
                borderRadius: msg.rol === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                padding: "11px 14px",
              }}
            >
              {msg.imagenUrl && (
                <img src={msg.imagenUrl} alt="Ticket" className="rounded-xl mb-2 max-h-48 object-contain w-full" />
              )}
              {msg.contenido ? (
                msg.rol === "user" ? (
                  <span>{msg.contenido}</span>
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong style={{ color: "#4ade80" }}>{children}</strong>,
                      em: ({ children }) => <em style={{ color: "rgba(207,232,232,0.7)" }}>{children}</em>,
                      ul: ({ children }) => <ul className="space-y-1.5 mb-2 mt-1">{children}</ul>,
                      ol: ({ children }) => <ol className="space-y-1.5 mb-2 mt-1 list-decimal list-inside">{children}</ol>,
                      li: ({ children }) => (
                        <li className="flex items-start gap-2 leading-snug">
                          <span style={{ color: "rgba(207,232,232,0.6)", flexShrink: 0, marginTop: 2 }}>•</span>
                          <span>{children}</span>
                        </li>
                      ),
                    }}
                  >
                    {msg.contenido}
                  </ReactMarkdown>
                )
              ) : (
                /* Typing dots */
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 7, height: 7, borderRadius: "50%",
                        backgroundColor: "rgba(207,232,232,0.5)",
                        animation: `td 1.2s ease-in-out ${i * 0.18}s infinite`,
                      }}
                    />
                  ))}
                  <style>{`@keyframes td{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}`}</style>
                </div>
              )}
            </div>
          </div>
        ))}

      </div>

      {error && (
        <div className="px-4 py-2 shrink-0 flex items-center gap-3" style={{ borderTop: "1px solid rgba(217,74,74,0.15)", backgroundColor: "rgba(217,74,74,0.06)" }}>
          <p className="flex-1 text-xs font-medium" style={{ color: "#D94A4A" }}>⚠ {error}</p>
          {ultimoMensajeFallido && (
            <button
              onClick={() => { setError(""); enviar(ultimoMensajeFallido); setUltimoMensajeFallido(""); }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
              style={{ backgroundColor: "#D94A4A", color: "#fff" }}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Preview imagen */}
      {imagenPendiente && (
        <div className="px-4 pt-3 shrink-0" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="relative inline-block">
            <img src={imagenPendiente.previewUrl} alt="Preview" className="h-20 rounded-xl object-cover" />
            <button
              onClick={() => setImagenPendiente(null)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "#ef4444", color: "white" }}
            >×</button>
          </div>
        </div>
      )}

      {/* ── INPUT ── */}
      <div
        className="shrink-0 flex items-center gap-2"
        style={{
          backgroundColor: "#0F2F2F",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingLeft: 12, paddingRight: 12,
          paddingTop: 10,
          paddingBottom: "calc(10px + env(safe-area-inset-bottom) + 60px)",
        }}
      >
        {/* Cámara */}
        <button
          onClick={() => inputImagenRef.current?.click()}
          disabled={cargando}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-opacity active:opacity-70 disabled:opacity-40"
          style={{ backgroundColor: "#F5F3EE", border: "none" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#0F2F2F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
        <input type="file" accept="image/*" capture="environment" ref={inputImagenRef} onChange={manejarImagen} className="hidden" />

        {/* Input pill */}
        <div
          className="flex-1 flex items-center"
          style={{
            height: 42, borderRadius: 21,
            backgroundColor: "#F5F3EE",
            border: "1px solid rgba(255,255,255,0.1)",
            paddingLeft: 16, paddingRight: 16,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder={imagenPendiente ? "Mensaje opcional..." : "Dile algo a Lani..."}
            disabled={cargando}
            className="flex-1 outline-none text-sm font-medium disabled:opacity-50"
            style={{ background: "transparent", border: "none", color: "#0F2F2F" }}
          />
        </div>

        {/* Enviar */}
        <button
          onClick={() => enviar()}
          disabled={(!input.trim() && !imagenPendiente) || cargando}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
          style={{
            backgroundColor: (input.trim() || imagenPendiente) && !cargando ? "#0F2F2F" : "rgba(15,47,47,0.08)",
            border: "none",
          }}
        >
          {cargando ? (
            <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </main>
  );
}
