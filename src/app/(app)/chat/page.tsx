"use client";

import { useState, useRef, useEffect } from "react";

interface Mensaje {
  rol: "user" | "assistant";
  contenido: string;
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
        "Hola, soy tu asistente financiero. Puedo analizar tus transacciones, darte consejos y también registrar nuevos gastos e ingresos. Dime por ejemplo: \"Gasté $300 en gasolina hoy\" y lo agrego automáticamente. ¿En qué te ayudo?",
    },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [notificacion, setNotificacion] = useState<TransaccionCreada | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    listaRef.current?.scrollTo({
      top: listaRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [mensajes]);

  // Ocultar notificación después de 4 segundos
  useEffect(() => {
    if (notificacion) {
      const timer = setTimeout(() => setNotificacion(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notificacion]);

  const enviar = async (texto?: string) => {
    const pregunta = (texto ?? input).trim();
    if (!pregunta || cargando) return;

    setInput("");
    setError("");

    const nuevosMensajes: Mensaje[] = [
      ...mensajes,
      { rol: "user", contenido: pregunta },
    ];
    setMensajes(nuevosMensajes);
    setCargando(true);

    // Placeholder mientras carga
    setMensajes((prev) => [...prev, { rol: "assistant", contenido: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensajes: nuevosMensajes.map((m) => ({
            role: m.rol,
            content: m.contenido,
          })),
          incluirContexto: true,
        }),
      });

      if (!res.ok) throw new Error("Error del servidor");

      const datos = await res.json();

      // Actualizar el último mensaje con la respuesta
      setMensajes((prev) => {
        const actualizado = [...prev];
        actualizado[actualizado.length - 1] = {
          rol: "assistant",
          contenido: datos.texto,
        };
        return actualizado;
      });

      // Mostrar notificación si se creó una transacción
      if (datos.transaccionCreada) {
        setNotificacion(datos.transaccionCreada);
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

  const formatearMonto = (monto: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(monto);

  return (
    <main className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Encabezado */}
      <header className="bg-primary-500 text-white px-6 pt-8 pb-4 shrink-0">
        <h1 className="text-lg font-bold">Chat con IA</h1>
        <p className="text-primary-200 text-xs">
          Analiza tus finanzas y registra gastos con lenguaje natural
        </p>
      </header>

      {/* Notificación de transacción creada */}
      {notificacion && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm animate-pulse-once shrink-0">
          <span className="text-green-500 text-xl">✅</span>
          <div>
            <p className="text-green-800 text-sm font-semibold">
              {notificacion.tipo === "gasto" ? "Gasto" : "Ingreso"} registrado
            </p>
            <p className="text-green-600 text-xs">
              {formatearMonto(notificacion.monto)} · {notificacion.categoria} · {notificacion.fecha}
            </p>
          </div>
        </div>
      )}

      {/* Lista de mensajes */}
      <div
        ref={listaRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50"
      >
        {mensajes.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.rol === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.rol === "assistant" && (
              <span className="text-xl mr-2 shrink-0 mt-1">🤖</span>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.rol === "user"
                  ? "bg-primary-500 text-white rounded-br-sm"
                  : "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-bl-sm"
              }`}
            >
              {msg.contenido || (
                <span className="flex gap-1 items-center text-gray-400">
                  <span className="animate-bounce delay-0">·</span>
                  <span className="animate-bounce delay-75">·</span>
                  <span className="animate-bounce delay-150">·</span>
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Sugerencias (solo al inicio) */}
        {mensajes.length === 1 && (
          <div className="pt-2">
            <p className="text-xs text-gray-400 mb-2 text-center">
              Prueba diciendo:
            </p>
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
        <p className="text-center text-red-500 text-xs px-4 py-2 bg-red-50">
          {error}
        </p>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 shrink-0">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviar()}
            placeholder="&quot;Gasté $200 en uber&quot; o pregunta algo..."
            disabled={cargando}
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-300 disabled:opacity-50"
          />
          <button
            onClick={() => enviar()}
            disabled={!input.trim() || cargando}
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
