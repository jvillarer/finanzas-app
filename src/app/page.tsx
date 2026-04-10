"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const SLIDES = [
  {
    emoji: "🐑",
    titulo: "Conoce a Lani",
    subtitulo: "Tu asistente financiera personal. Habla con ella como si fuera tu amiga — registra gastos, analiza tu dinero y te da consejos reales.",
  },
  {
    emoji: "🎙️",
    titulo: "Solo díselo",
    subtitulo: "\"Gasté $300 en Uber\" y listo. Lani lo registra al momento. También puede leer fotos de tickets.",
  },
  {
    emoji: "📊",
    titulo: "Entiende tu dinero",
    subtitulo: "Ve exactamente en qué gastas, pon límites por categoría y recibe alertas antes de pasarte.",
  },
];

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Si ya está logueado, redirigir al dashboard
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/dashboard");
    };
    checkSession();
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col px-6 pt-16 pb-10" style={{ backgroundColor: "#111" }}>

      {/* Slides */}
      <div className="flex-1 flex flex-col">
        {SLIDES.map((slide, i) => (
          <div key={i} className="flex items-start gap-4 mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {slide.emoji}
            </div>
            <div className="pt-1">
              <p className="text-base font-black text-white mb-1">{slide.titulo}</p>
              <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>{slide.subtitulo}</p>
            </div>
          </div>
        ))}

        {/* Preview de la app */}
        <div
          className="rounded-3xl p-5 mt-2"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: "#22c55e" }}>🐑</div>
            <div>
              <p className="text-sm font-black text-white">Lani</p>
              <p className="text-xs font-semibold" style={{ color: "#22c55e" }}>● en línea</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: "#222", color: "#fff", borderTopLeftRadius: 4 }}>
              Hola! Soy Lani. Dime un gasto y te lo registro en segundos.
            </div>
            <div className="rounded-2xl px-4 py-3 text-sm ml-8" style={{ backgroundColor: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)", color: "#fff", borderTopRightRadius: 4 }}>
              Gasté $500 en el súper
            </div>
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: "#222", color: "#fff", borderTopLeftRadius: 4 }}>
              Listo! Registré <strong style={{ color: "#22c55e" }}>$500 en Supermercado</strong>. Llevas $2,340 en gastos esta semana.
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-8 space-y-3">
        <Link
          href="/registro"
          className="block w-full text-center font-bold py-4 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#22c55e", color: "#000" }}
        >
          Empezar gratis
        </Link>
        <Link
          href="/login"
          className="block w-full text-center font-bold py-4 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}
        >
          Ya tengo cuenta
        </Link>
      </div>
    </main>
  );
}
