"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const PASOS = [
  {
    emoji: "💬",
    titulo: "Habla con Lani",
    descripcion: "Dile tus gastos e ingresos en lenguaje natural. \"Gasté $200 en gasolina\" — y ya quedó registrado.",
    accion: "Entendido",
  },
  {
    emoji: "📸",
    titulo: "Sube fotos de tickets",
    descripcion: "Toma foto de cualquier recibo y Lani registra cada producto automáticamente.",
    accion: "Qué bueno",
  },
  {
    emoji: "🎯",
    titulo: "Pon límites de gasto",
    descripcion: "En la pestaña Límites puedes fijar cuánto gastar por categoría. Lani te avisa si te estás pasando.",
    accion: "Ya entendí",
  },
  {
    emoji: "🐑",
    titulo: "¡Listo, empecemos!",
    descripcion: "Tu primera misión: dile a Lani cuánto ganaste este mes para que tengamos un punto de partida.",
    accion: "Hablar con Lani",
  },
];

export default function BienvenidaPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const n = user.user_metadata?.nombre_completo || "";
      setNombre(n.split(" ")[0] || "");
    };
    cargar();
  }, [router]);

  const siguiente = () => {
    if (paso < PASOS.length - 1) {
      setPaso((p) => p + 1);
    } else {
      localStorage.setItem("lani_onboarding_done", "1");
      router.replace("/chat");
    }
  };

  const slide = PASOS[paso];

  return (
    <main className="min-h-screen flex flex-col px-6 pt-16 pb-12" style={{ backgroundColor: "#111" }}>

      {/* Dots */}
      <div className="flex gap-1.5 justify-center mb-12">
        {PASOS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === paso ? 24 : 6,
              height: 6,
              backgroundColor: i === paso ? "#22c55e" : "rgba(255,255,255,0.12)",
            }}
          />
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-8 transition-all"
          style={{
            backgroundColor: paso === PASOS.length - 1 ? "#22c55e" : "#1c1c1c",
            border: paso === PASOS.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
            boxShadow: paso === PASOS.length - 1 ? "0 0 60px rgba(34,197,94,0.3)" : "none",
          }}
        >
          {slide.emoji}
        </div>

        {paso === 0 && nombre && (
          <p className="text-sm font-bold mb-2" style={{ color: "#22c55e" }}>
            Hola, {nombre}
          </p>
        )}

        <h1 className="text-2xl font-black text-white mb-4">{slide.titulo}</h1>
        <p className="text-sm leading-relaxed max-w-xs" style={{ color: "#6b7280" }}>
          {slide.descripcion}
        </p>
      </div>

      {/* Botón */}
      <div className="space-y-3">
        <button
          onClick={siguiente}
          className="w-full font-bold py-4 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#22c55e", color: "#000" }}
        >
          {slide.accion}
        </button>

        {paso < PASOS.length - 1 && (
          <button
            onClick={() => {
              localStorage.setItem("lani_onboarding_done", "1");
              router.replace("/dashboard");
            }}
            className="w-full py-3 text-sm font-semibold"
            style={{ color: "#4b5563" }}
          >
            Saltar intro
          </button>
        )}
      </div>
    </main>
  );
}
