"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

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

// Corrige variantes con que el STT confunde "Lani"
function corregirSTT(texto: string) {
  return texto
    .replace(/\b(nani|leni|leny|laní|lahni|lonni|lonny|lanny|lanie|laney|lane|lari|lany|lain|laani|lanne|lhani|llani|lhany|lhane)\b/gi, "Lani")
    .replace(/\b(el lani|a lani|de lani|con lani|para lani|el nani|a nani|de nani|con nani|para nani)\b/gi, (m) =>
      m.replace(/nani|lani/i, "Lani"))
    .trim();
}

function limpiarMarkdown(texto: string) {
  return texto
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/#{1,6}\s/g, "")
    // Eliminar emojis (surrogate pairs + símbolos misceláneos)
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\uFE00-\uFE0F]/g, "")
    // Limpiar puntuación duplicada tras quitar emojis
    .replace(/\s{2,}/g, " ")
    .replace(/\n+/g, ". ")
    .trim();
}

// ── Animación de ondas ──
function WaveAnimation({ color = "#22c55e", size = 40 }: { color?: string; size?: number }) {
  return (
    <div className="flex items-center justify-center gap-1" style={{ height: size }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: 4,
            backgroundColor: color,
            animation: `wave 1s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
            height: `${[35, 65, 100, 65, 35][i]}%`,
            opacity: 0.9,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

// ── Modo voz full-screen ──
function ModoVoz({
  grabando,
  hablando,
  onToggleMic,
  onCerrar,
}: {
  grabando: boolean;
  hablando: boolean;
  onToggleMic: () => void;
  onCerrar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between px-8 pt-20 pb-16"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Cerrar */}
      <button
        onClick={onCerrar}
        className="self-end w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "#1c1c1c" }}
      >
        <svg viewBox="0 0 20 20" fill="#6b7280" className="w-4 h-4">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>

      {/* Avatar Lani */}
      <div className="flex flex-col items-center gap-6">
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-6xl transition-all"
          style={{
            backgroundColor: hablando ? "#22c55e" : grabando ? "rgba(239,68,68,0.15)" : "#1c1c1c",
            border: hablando
              ? "3px solid #22c55e"
              : grabando
              ? "3px solid rgba(239,68,68,0.6)"
              : "3px solid rgba(255,255,255,0.08)",
            boxShadow: hablando
              ? "0 0 40px rgba(34,197,94,0.3)"
              : grabando
              ? "0 0 40px rgba(239,68,68,0.2)"
              : "none",
          }}
        >
          🐑
        </div>

        {/* Estado */}
        <div className="text-center">
          <p className="text-xl font-black text-white mb-1">
            {hablando ? "Lani está hablando" : grabando ? "Te escucho..." : "Lani"}
          </p>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            {hablando ? "Espera un momento" : grabando ? "Di tu gasto o pregunta" : "Toca el micrófono para hablar"}
          </p>
        </div>

        {/* Onda */}
        <div className="h-12 flex items-center">
          {(hablando || grabando) ? (
            <WaveAnimation color={hablando ? "#22c55e" : "#ef4444"} size={48} />
          ) : (
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-1 rounded-full" style={{ height: 4, backgroundColor: "#333" }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Botón micrófono */}
      <button
        onClick={onToggleMic}
        disabled={hablando}
        className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
        style={{
          backgroundColor: grabando ? "rgba(239,68,68,0.15)" : "#22c55e",
          border: grabando ? "2px solid rgba(239,68,68,0.6)" : "none",
          boxShadow: grabando ? "0 0 30px rgba(239,68,68,0.2)" : "0 8px 32px rgba(34,197,94,0.4)",
        }}
      >
        {grabando ? (
          <span className="w-6 h-6 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth={2} className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      rol: "assistant",
      contenido: "¡Hola! 🐑 Soy Lani, tu asistente financiera. Dime tus gastos e ingresos y los registro al momento. También puedo **leer fotos de tickets**.\n\n¿En qué te ayudo?",
    },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [imagenPendiente, setImagenPendiente] = useState<{
    base64: string; mediaType: string; previewUrl: string;
  } | null>(null);

  // Voz
  const [grabando, setGrabando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);
  const [modoVoz, setModoVoz] = useState(false);
  const [soportaVoz, setSoportaVoz] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Ref para evitar stale closure en callbacks async
  const modoVozRef = useRef(false);
  const iniciarGrabacionRef = useRef<() => void>(() => {});

  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputImagenRef = useRef<HTMLInputElement>(null);
  const audioDesbloqueadoRef = useRef(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSoportaVoz(!!SR && !!window.speechSynthesis);
  }, []);

  // Mantener refs sincronizados
  useEffect(() => { modoVozRef.current = modoVoz; }, [modoVoz]);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

  useEffect(() => {
    if (notificacion) {
      const t = setTimeout(() => setNotificacion(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notificacion]);

  // ── Desbloquear audio en iOS (llamar desde gesto directo del usuario) ──
  const desbloquearAudio = useCallback(() => {
    if (audioDesbloqueadoRef.current || !window.speechSynthesis) return;
    // iOS necesita un utterance con texto real (aunque sea espacio) para desbloquear
    const utt = new SpeechSynthesisUtterance(" ");
    utt.volume = 0;
    utt.rate = 10; // rapidísimo para que no se escuche
    window.speechSynthesis.speak(utt);
    audioDesbloqueadoRef.current = true;
  }, []);

  // ── Hablar ──
  const hablarLani = useCallback((texto: string, onEnd?: () => void) => {
    if (!vozActiva && !modoVoz) { onEnd?.(); return; }
    if (!window.speechSynthesis) { onEnd?.(); return; }

    window.speechSynthesis.cancel();

    // iOS bug: necesita ~100ms después de cancel() antes de speak()
    setTimeout(() => {
      const textoLimpio = limpiarMarkdown(texto);
      if (!textoLimpio) { onEnd?.(); return; }

      const utt = new SpeechSynthesisUtterance(textoLimpio);
      utt.lang = "es-MX";
      utt.rate = 0.92;   // más lento = más claro
      utt.pitch = 1.05;
      utt.volume = 1;

      utt.onstart = () => setHablando(true);
      utt.onend = () => { setHablando(false); onEnd?.(); };
      utt.onerror = () => { setHablando(false); onEnd?.(); };

      synthRef.current = utt;

      const elegirVozYHablar = () => {
        const voces = window.speechSynthesis.getVoices();
        // Prioridad: enhanced femenina es-MX → Paulina → cualquier es-MX → enhanced es → cualquier es
        const voz =
          voces.find((v) => v.lang === "es-MX" && /enhanced|premium/i.test(v.name)) ||
          voces.find((v) => v.lang === "es-MX" && /paulina|female|mujer/i.test(v.name)) ||
          voces.find((v) => v.lang === "es-MX") ||
          voces.find((v) => v.lang === "es-ES" && /enhanced|premium/i.test(v.name)) ||
          voces.find((v) => v.lang === "es-ES" && /monica|elena|female/i.test(v.name)) ||
          voces.find((v) => v.lang.startsWith("es")) ||
          null;
        if (voz) utt.voice = voz;
        window.speechSynthesis.speak(utt);
      };

      const voces = window.speechSynthesis.getVoices();
      if (voces.length > 0) {
        elegirVozYHablar();
      } else {
        window.speechSynthesis.onvoiceschanged = () => elegirVozYHablar();
        setTimeout(elegirVozYHablar, 600);
      }
    }, 100);
  }, [vozActiva, modoVoz]);

  // ── Grabar ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const iniciarGrabacion = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    window.speechSynthesis?.cancel();
    setHablando(false);

    const rec = new SR();
    rec.lang = "es-MX";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      const texto = corregirSTT(e.results[0][0].transcript);
      setGrabando(false);
      enviar(texto);
    };
    rec.onerror = () => setGrabando(false);
    rec.onend = () => setGrabando(false);

    recognitionRef.current = rec;
    rec.start();
    setGrabando(true);
  }, []);

  // Mantener ref sincronizado para callbacks async
  useEffect(() => { iniciarGrabacionRef.current = iniciarGrabacion; }, [iniciarGrabacion]);

  const detenerGrabacion = useCallback(() => {
    recognitionRef.current?.stop();
    setGrabando(false);
  }, []);

  const toggleGrabacion = useCallback(() => {
    desbloquearAudio();
    if (grabando) detenerGrabacion();
    else iniciarGrabacion();
  }, [grabando, iniciarGrabacion, detenerGrabacion, desbloquearAudio]);

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
    desbloquearAudio();
    const pregunta = (texto ?? input).trim();
    if (!pregunta && !imagenPendiente) return;
    if (cargando) return;

    const textoFinal = pregunta || "Analiza este ticket y registra cada producto";
    setInput("");
    setError("");

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

      // En modo voz: habla y luego vuelve a escuchar automáticamente
      hablarLani(datos.texto, () => {
        if (modoVozRef.current) setTimeout(() => iniciarGrabacionRef.current(), 600);
      });

      const creadas: TransaccionCreada[] = datos.transaccionesCreadas || [];
      if (creadas.length === 1) {
        const t = creadas[0];
        const monto = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(t.monto);
        setNotificacion(`✓ ${t.tipo === "gasto" ? "Gasto" : "Ingreso"} registrado: ${monto} · ${t.categoria}`);
      } else if (creadas.length > 1) {
        const total = creadas.reduce((s, t) => s + t.monto, 0);
        const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total);
        setNotificacion(`✓ ${creadas.length} movimientos registrados · ${fmt}`);
      }
    } catch {
      setError("No se pudo enviar. Verifica tu conexión.");
      setMensajes((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.contenido === "")));
    } finally {
      setCargando(false);
    }
  };

  // Cerrar modo voz
  const cerrarModoVoz = () => {
    detenerGrabacion();
    window.speechSynthesis?.cancel();
    setHablando(false);
    setModoVoz(false);
  };

  // Abrir modo voz
  const abrirModoVoz = () => {
    desbloquearAudio();
    setModoVoz(true);
    setTimeout(() => iniciarGrabacion(), 300);
  };

  // ── MODO VOZ FULL-SCREEN ──
  if (modoVoz) {
    return (
      <>
        <ModoVoz
          grabando={grabando}
          hablando={hablando}
          onToggleMic={toggleGrabacion}
          onCerrar={cerrarModoVoz}
        />
        {notificacion && (
          <div
            className="fixed bottom-8 left-4 right-4 z-[60] rounded-2xl px-4 py-3 text-sm font-semibold text-center fade-in"
            style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
          >
            {notificacion}
          </div>
        )}
      </>
    );
  }

  return (
    <main className="flex flex-col h-screen" style={{ backgroundColor: "#111" }}>

      {/* ── HEADER ── */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-4 shrink-0"
        style={{ backgroundColor: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: "#22c55e" }}>
          🐑
        </div>
        <div className="flex-1">
          <p className="text-base font-black text-white">Lani</p>
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#22c55e" }}>
            {hablando
              ? <><WaveAnimation color="#22c55e" size={14} /> hablando</>
              : <><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#22c55e" }} />en línea</>
            }
          </p>
        </div>

        {/* Toggle speaker */}
        {soportaVoz && (
          <button
            onClick={() => {
              if (vozActiva) window.speechSynthesis?.cancel();
              setVozActiva((v) => !v);
            }}
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all active:scale-95"
            style={{
              backgroundColor: vozActiva ? "rgba(34,197,94,0.12)" : "#1c1c1c",
              border: vozActiva ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.07)",
            }}
            title={vozActiva ? "Silenciar" : "Activar voz"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={vozActiva ? "#22c55e" : "#4b5563"} strokeWidth={2} className="w-4 h-4">
              {vozActiva ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Notificación */}
      {notificacion && (
        <div
          className="mx-4 mt-3 shrink-0 rounded-2xl px-4 py-3 text-sm font-semibold fade-in"
          style={{ backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
        >
          {notificacion}
        </div>
      )}

      {/* Banner grabando */}
      {grabando && (
        <div
          className="mx-4 mt-3 shrink-0 rounded-2xl px-4 py-3 flex items-center gap-3 fade-in"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: "#ef4444" }} />
          <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>Escuchando... habla ahora</p>
        </div>
      )}

      {/* ── MENSAJES ── */}
      <div ref={listaRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scroll">
        {mensajes.map((msg, i) => (
          <div key={i} className={`flex ${msg.rol === "user" ? "justify-end" : "justify-start"}`}>
            {msg.rol === "assistant" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 mr-2 mt-1" style={{ backgroundColor: "#22c55e" }}>
                🐑
              </div>
            )}
            <div
              className="max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-relaxed"
              style={{
                backgroundColor: msg.rol === "user" ? "rgba(34,197,94,0.12)" : "#1c1c1c",
                border: msg.rol === "user" ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(255,255,255,0.06)",
                color: "#ffffff",
                borderTopRightRadius: msg.rol === "user" ? "4px" : undefined,
                borderTopLeftRadius: msg.rol === "assistant" ? "4px" : undefined,
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
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong style={{ color: "#22c55e" }}>{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                      li: ({ children }) => <li>{children}</li>,
                    }}
                  >
                    {msg.contenido}
                  </ReactMarkdown>
                )
              ) : (
                <span className="flex gap-1 items-center">
                  {[0, 1, 2].map((j) => (
                    <span key={j} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#6b7280", animationDelay: `${j * 0.15}s` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}

        {mensajes.length === 1 && (
          <div className="pt-2">
            <p className="text-xs mb-2 text-center" style={{ color: "#6b7280" }}>Prueba diciendo:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-xs px-3 py-2 rounded-2xl font-semibold transition-all active:scale-95"
                  style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Botón modo voz destacado */}
            {soportaVoz && (
              <button
                onClick={abrirModoVoz}
                className="mt-4 w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-[0.98]"
                style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
                Hablar con Lani
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-center text-xs px-4 py-2 shrink-0" style={{ color: "#ef4444" }}>{error}</p>}

      {/* Preview imagen */}
      {imagenPendiente && (
        <div className="px-4 pt-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
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
        className="px-4 py-3 shrink-0"
        style={{
          backgroundColor: "#111",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "calc(72px + env(safe-area-inset-bottom) + 12px)",
        }}
      >
        <div className="flex gap-2 items-end">

          {/* Cámara */}
          <button
            onClick={() => inputImagenRef.current?.click()}
            disabled={cargando || grabando}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-opacity active:opacity-70 disabled:opacity-40"
            style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.8} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </button>
          <input type="file" accept="image/*" capture="environment" ref={inputImagenRef} onChange={manejarImagen} className="hidden" />

          {/* Input texto */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder={grabando ? "Escuchando..." : imagenPendiente ? "Mensaje opcional..." : "Dile algo a Lani..."}
            disabled={cargando || grabando}
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium outline-none text-white placeholder-gray-600 disabled:opacity-50"
            style={{
              backgroundColor: "#1c1c1c",
              border: `1px solid ${grabando ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.07)"}`,
            }}
          />

          {/* Micrófono */}
          {soportaVoz && (
            <button
              onClick={toggleGrabacion}
              disabled={cargando || hablando}
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-30"
              style={{
                backgroundColor: grabando ? "rgba(239,68,68,0.12)" : "#1c1c1c",
                border: grabando ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {grabando ? (
                <span className="w-3 h-3 rounded-sm animate-pulse" style={{ backgroundColor: "#ef4444" }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.8} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          )}

          {/* Enviar */}
          <button
            onClick={() => enviar()}
            disabled={(!input.trim() && !imagenPendiente) || cargando || grabando}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-30"
            style={{ backgroundColor: "#22c55e" }}
          >
            {cargando ? (
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth={2.2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
