"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Mensaje {
  rol: "user" | "assistant";
  contenido: string;
  imagenUrl?: string; // solo para display
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
      contenido:
        "Hola, soy tu asistente financiero. Puedo analizar tus finanzas, registrar gastos con texto y también **leer fotos de tickets** para registrar cada producto automáticamente.\n\n¿En qué te ayudo?",
    },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState<{ texto: string; color: string } | null>(null);
  const [imagenPendiente, setImagenPendiente] = useState<{
    base64: string;
    mediaType: string;
    previewUrl: string;
  } | null>(null);

  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputImagenRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [mensajes]);

  // Ocultar notificación después de 5 segundos
  useEffect(() => {
    if (notificacion) {
      const timer = setTimeout(() => setNotificacion(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notificacion]);

  // Manejar selección de imagen
  const manejarImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      // resultado = "data:image/jpeg;base64,XXXX..."
      const [encabezado, base64] = resultado.split(",");
      const mediaType = encabezado.match(/:(.*?);/)?.[1] || "image/jpeg";
      setImagenPendiente({ base64, mediaType, previewUrl: resultado });
    };
    reader.readAsDataURL(archivo);
    // Reset input para poder seleccionar la misma imagen dos veces
    e.target.value = "";
  };

  const enviar = async (texto?: string) => {
    const pregunta = (texto ?? input).trim();
    const tieneImagen = !!imagenPendiente;

    if (!pregunta && !tieneImagen) return;
    if (cargando) return;

    const textoFinal = pregunta || "Analiza este ticket y registra cada producto";
    setInput("");
    setError("");

    // Agregar mensaje del usuario con preview de imagen si aplica
    const nuevosMensajes: Mensaje[] = [
      ...mensajes,
      { rol: "user", contenido: textoFinal, imagenUrl: imagenPendiente?.previewUrl },
    ];
    setMensajes(nuevosMensajes);
    const imagenParaEnviar = imagenPendiente;
    setImagenPendiente(null);
    setCargando(true);

    // Placeholder del asistente
    setMensajes((prev) => [...prev, { rol: "assistant", contenido: "" }]);

    try {
      const cuerpo: Record<string, unknown> = {
        mensajes: nuevosMensajes.map((m) => ({ role: m.rol, content: m.contenido })),
        incluirContexto: true,
      };

      if (imagenParaEnviar) {
        cuerpo.imagen = {
          base64: imagenParaEnviar.base64,
          mediaType: imagenParaEnviar.mediaType,
        };
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });

      if (!res.ok) throw new Error("Error del servidor");

      const datos = await res.json();

      setMensajes((prev) => {
        const actualizado = [...prev];
        actualizado[actualizado.length - 1] = { rol: "assistant", contenido: datos.texto };
        return actualizado;
      });

      // Notificación según transacciones creadas
      const creadas: TransaccionCreada[] = datos.transaccionesCreadas || [];
      if (creadas.length === 1) {
        const t = creadas[0];
        const monto = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(t.monto);
        setNotificacion({
          texto: `${t.tipo === "gasto" ? "Gasto" : "Ingreso"} registrado: ${monto} · ${t.categoria}`,
          color: t.tipo === "gasto" ? "green" : "blue",
        });
      } else if (creadas.length > 1) {
        const total = creadas.reduce((s, t) => s + t.monto, 0);
        const totalFmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(total);
        setNotificacion({
          texto: `${creadas.length} transacciones registradas · Total: ${totalFmt}`,
          color: "green",
        });
      }
    } catch {
      setError("No se pudo enviar el mensaje. Verifica tu conexión.");
      setMensajes((prev) =>
        prev.filter((m, i) => !(i === prev.length - 1 && m.contenido === ""))
      );
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Encabezado */}
      <header className="bg-primary-500 text-white px-6 pt-8 pb-4 shrink-0">
        <h1 className="text-lg font-bold">Chat con IA</h1>
        <p className="text-primary-200 text-xs">
          Analiza finanzas · Registra gastos · Lee tickets con foto
        </p>
      </header>

      {/* Notificación */}
      {notificacion && (
        <div className={`mx-4 mt-3 shrink-0 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border ${
          notificacion.color === "blue"
            ? "bg-blue-50 border-blue-200"
            : "bg-green-50 border-green-200"
        }`}>
          <span className="text-xl">✅</span>
          <p className={`text-sm font-medium ${notificacion.color === "blue" ? "text-blue-800" : "text-green-800"}`}>
            {notificacion.texto}
          </p>
        </div>
      )}

      {/* Lista de mensajes */}
      <div ref={listaRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {mensajes.map((msg, i) => (
          <div key={i} className={`flex ${msg.rol === "user" ? "justify-end" : "justify-start"}`}>
            {msg.rol === "assistant" && (
              <span className="text-xl mr-2 shrink-0 mt-1">🤖</span>
            )}
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${
              msg.rol === "user"
                ? "bg-primary-500 text-white rounded-br-sm"
                : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-sm"
            }`}>
              {/* Preview de imagen adjunta */}
              {msg.imagenUrl && (
                <img
                  src={msg.imagenUrl}
                  alt="Ticket adjunto"
                  className="rounded-lg mb-2 max-h-48 object-contain w-full"
                />
              )}
              {msg.contenido ? (
                msg.rol === "user" ? (
                  <span>{msg.contenido}</span>
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                    }}
                  >
                    {msg.contenido}
                  </ReactMarkdown>
                )
              ) : (
                <span className="flex gap-1 items-center text-gray-400">
                  <span className="animate-bounce delay-0">·</span>
                  <span className="animate-bounce delay-75">·</span>
                  <span className="animate-bounce delay-150">·</span>
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Sugerencias iniciales */}
        {mensajes.length === 1 && (
          <div className="pt-2">
            <p className="text-xs text-gray-400 mb-2 text-center">Prueba diciendo:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGERENCIAS.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="bg-white border border-primary-200 text-primary-600 text-xs px-3 py-2 rounded-xl hover:bg-primary-50 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-center text-red-500 text-xs px-4 py-2 bg-red-50">{error}</p>
      )}

      {/* Preview imagen pendiente */}
      {imagenPendiente && (
        <div className="px-4 pt-3 bg-white border-t border-gray-100 shrink-0">
          <div className="relative inline-block">
            <img
              src={imagenPendiente.previewUrl}
              alt="Preview"
              className="h-20 rounded-lg object-cover border border-gray-200"
            />
            <button
              onClick={() => setImagenPendiente(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Foto lista para analizar. Puedes agregar un mensaje o enviar directo.</p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
        <div className="flex gap-2 items-center">
          {/* Botón cámara */}
          <button
            onClick={() => inputImagenRef.current?.click()}
            disabled={cargando}
            className="text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-40 shrink-0"
            aria-label="Adjuntar foto de ticket"
            title="Fotografiar ticket"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Input oculto para imagen — capture="environment" abre cámara trasera en móvil */}
          <input
            ref={inputImagenRef}
            type="file"
            accept="image/*"
            onChange={manejarImagen}
            className="hidden"
          />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder={imagenPendiente ? "Mensaje opcional..." : '"Gasté $200 en uber" o pregunta algo...'}
            disabled={cargando}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50"
          />

          <button
            onClick={() => enviar()}
            disabled={(!input.trim() && !imagenPendiente) || cargando}
            className="bg-primary-500 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-primary-600 disabled:opacity-40 transition-colors shrink-0"
            aria-label="Enviar"
          >
            {cargando ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
