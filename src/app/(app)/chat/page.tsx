"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Mensaje {
  rol: "user" | "assistant";
  contenido: string;
  imagenUrl?: string;
}

interface TransaccionCreada {
  monto: number;
  descripcion: string;
  categoria: string;
  tipo: "gasto" | "ingreso";
  fecha: string;
}

const SUGERENCIAS = [
  "¿Cuánto gasté este mes?",
  "¿En qué categoría gasto más?",
  "Gasté $500 en comida hoy",
  "Me depositaron $15,000 de nómina",
];

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      rol: "assistant",
      contenido: "¡Hola! 🐑 Soy Lani, tu asistente financiera. Dime tus gastos e ingresos y los registro al momento. También puedo **leer fotos de tickets** y registrar cada producto.\n\n¿En qué te ayudo?",
    },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState<string | null>(null);
  const [imagenPendiente, setImagenPendiente] = useState<{
    base64: string;
    mediaType: string;
    previewUrl: string;
  } | null>(null);

  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputImagenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

  useEffect(() => {
    if (notificacion) {
      const t = setTimeout(() => setNotificacion(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notificacion]);

  const comprimirImagen = (archivo: File): Promise<{ base64: string; previewUrl: string }> => {
    return new Promise((resolve) => {
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
  };

  const manejarImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    e.target.value = "";
    const { base64, previewUrl } = await comprimirImagen(archivo);
    setImagenPendiente({ base64, mediaType: "image/jpeg", previewUrl });
  };

  const enviar = async (texto?: string) => {
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

      const creadas: TransaccionCreada[] = datos.transaccionesCreadas || [];
      if (creadas.length === 1) {
        const t = creadas[0];
        const monto = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(t.monto);
        setNotificacion(`✓ ${t.tipo === "gasto" ? "Gasto" : "Ingreso"} registrado: ${monto} · ${t.categoria}`);
      } else if (creadas.length > 1) {
        const total = creadas.reduce((s, t) => s + t.monto, 0);
        const totalFmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total);
        setNotificacion(`✓ ${creadas.length} movimientos registrados · ${totalFmt}`);
      }
    } catch {
      setError("No se pudo enviar. Verifica tu conexión.");
      setMensajes((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.contenido === "")));
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  };

  return (
    <main className="flex flex-col h-screen" style={{ backgroundColor: "#111" }}>

      {/* ── HEADER ── */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-4 shrink-0"
        style={{ backgroundColor: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: "#22c55e" }}
        >
          🐑
        </div>
        <div>
          <p className="text-base font-black text-white">Lani</p>
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "#22c55e" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#22c55e" }} />
            en línea
          </p>
        </div>
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

      {/* ── MENSAJES ── */}
      <div ref={listaRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scroll">
        {mensajes.map((msg, i) => (
          <div key={i} className={`flex ${msg.rol === "user" ? "justify-end" : "justify-start"}`}>
            {msg.rol === "assistant" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 mr-2 mt-1"
                style={{ backgroundColor: "#22c55e" }}
              >
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
                    <span
                      key={j}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ backgroundColor: "#6b7280", animationDelay: `${j * 0.15}s` }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Sugerencias */}
        {mensajes.length === 1 && (
          <div className="pt-2">
            <p className="text-xs mb-2 text-center" style={{ color: "#6b7280" }}>Prueba diciendo:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-xs px-3 py-2 rounded-2xl font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: "#1c1c1c",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#9ca3af",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-center text-xs px-4 py-2 shrink-0" style={{ color: "#ef4444" }}>{error}</p>
      )}

      {/* Preview imagen */}
      {imagenPendiente && (
        <div className="px-4 pt-3 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="relative inline-block">
            <img src={imagenPendiente.previewUrl} alt="Preview" className="h-20 rounded-xl object-cover" />
            <button
              onClick={() => setImagenPendiente(null)}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "#ef4444", color: "white" }}
            >
              ×
            </button>
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
          <button
            onClick={() => inputImagenRef.current?.click()}
            disabled={cargando}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-opacity active:opacity-70 disabled:opacity-40"
            style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.8} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </button>
          <input type="file" accept="image/*" capture="environment" ref={inputImagenRef} onChange={manejarImagen} className="hidden" />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder={imagenPendiente ? "Mensaje opcional..." : "Dile algo a Lani..."}
            disabled={cargando}
            className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium outline-none text-white placeholder-gray-600 disabled:opacity-50"
            style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }}
          />

          <button
            onClick={() => enviar()}
            disabled={(!input.trim() && !imagenPendiente) || cargando}
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
