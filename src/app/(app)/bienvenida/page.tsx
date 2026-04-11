"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

/* ── Mockups visuales para cada slide ── */

function MockupChat({ nombre }: { nombre: string }) {
  return (
    <div className="w-full h-full flex flex-col justify-end gap-2.5 p-5">
      {/* Mensaje Lani */}
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-xs font-black text-white flex-shrink-0">L</div>
        <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[75%] shadow-sm">
          <p className="text-xs font-semibold text-gray-800">Hola {nombre || ""}! Soy Lani 🐑 Cuéntame tus gastos.</p>
        </div>
      </div>
      {/* Mensaje usuario */}
      <div className="flex justify-end">
        <div className="bg-black rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%]">
          <p className="text-xs font-semibold text-white">Gasté $350 en el súper hoy</p>
        </div>
      </div>
      {/* Respuesta Lani */}
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-xs font-black text-white flex-shrink-0">L</div>
        <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[75%] shadow-sm">
          <p className="text-xs font-semibold text-gray-800">Listo, registré $350 en Supermercado.</p>
        </div>
      </div>
    </div>
  );
}

function MockupTicket() {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-md w-full max-w-[220px] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-black text-gray-800 tracking-wide uppercase">Ticket</p>
          <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
        {[
          { concepto: "Leche", monto: "$28.00" },
          { concepto: "Pan", monto: "$35.50" },
          { concepto: "Frutas", monto: "$89.00" },
          { concepto: "Yogurt", monto: "$42.00" },
        ].map((item, i) => (
          <div key={i} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
            <p className="text-xs text-gray-500">{item.concepto}</p>
            <p className="text-xs font-bold text-gray-800">{item.monto}</p>
          </div>
        ))}
        <div className="mt-3 flex justify-between">
          <p className="text-xs font-black text-gray-800">Total</p>
          <p className="text-xs font-black text-gray-800">$194.50</p>
        </div>
        <div className="mt-3 bg-black rounded-xl py-2 text-center">
          <p className="text-xs font-bold text-white">Registrado por Lani</p>
        </div>
      </div>
    </div>
  );
}

function MockupLimites() {
  const categorias = [
    { nombre: "Comida", gasto: 72, limite: 100, color: "#22c55e" },
    { nombre: "Transporte", gasto: 90, limite: 100, color: "#f59e0b" },
    { nombre: "Entretenimiento", gasto: 105, limite: 100, color: "#ef4444" },
  ];
  return (
    <div className="w-full h-full flex flex-col justify-center gap-3 p-6">
      {categorias.map((cat) => {
        const pct = Math.min((cat.gasto / cat.limite) * 100, 100);
        return (
          <div key={cat.nombre} className="bg-white rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-gray-800">{cat.nombre}</p>
              <p className="text-xs font-semibold" style={{ color: cat.color }}>
                ${cat.gasto} / ${cat.limite}
              </p>
            </div>
            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: cat.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MockupListo({ nombre }: { nombre: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4">
      <div className="w-24 h-24 rounded-3xl bg-black flex items-center justify-center shadow-lg">
        <span className="text-5xl">🐑</span>
      </div>
      <div className="bg-white rounded-2xl px-6 py-4 shadow-sm text-center mx-8">
        <p className="text-xs font-black text-gray-800 mb-0.5">
          {nombre ? `¡Hola, ${nombre}!` : "¡Todo listo!"}
        </p>
        <p className="text-xs text-gray-400">Tu asistente financiera te espera</p>
      </div>
    </div>
  );
}

/* ── Slides de onboarding ── */

const SLIDES = [
  {
    titulo: "Habla con Lani",
    descripcion: "Dile tus gastos en lenguaje natural. \"Gasté $200 en gasolina\" — y ya queda registrado.",
    accion: "Continuar",
  },
  {
    titulo: "Sube fotos de tickets",
    descripcion: "Toma foto de cualquier recibo y Lani registra cada producto automáticamente.",
    accion: "Continuar",
  },
  {
    titulo: "Pon límites de gasto",
    descripcion: "Fija cuánto gastar por categoría. Lani te avisa cuando te estás pasando.",
    accion: "Continuar",
  },
  {
    titulo: "¡Ya estás lista!",
    descripcion: "Primero cuéntale a Lani cuánto ganaste este mes para tener un punto de partida.",
    accion: "Hablar con Lani",
  },
];

export default function BienvenidaPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const n = user.user_metadata?.nombre_completo || "";
      setNombre(n.split(" ")[0] || "");
    })();
  }, [router]);

  const siguiente = () => {
    if (paso < SLIDES.length - 1) {
      setPaso((p) => p + 1);
    } else {
      localStorage.setItem("lani_onboarding_done", "1");
      router.replace("/chat");
    }
  };

  const saltar = () => {
    localStorage.setItem("lani_onboarding_done", "1");
    router.replace("/chat");
  };

  const slide = SLIDES[paso];

  const mockups = [
    <MockupChat key="chat" nombre={nombre} />,
    <MockupTicket key="ticket" />,
    <MockupLimites key="limites" />,
    <MockupListo key="listo" nombre={nombre} />,
  ];

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#f2f2f7" }}>

      {/* Dots — parte superior */}
      <div className="flex gap-1.5 justify-center pt-14 pb-2">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === paso ? 22 : 6,
              height: 6,
              backgroundColor: i === paso ? "#000" : "#d1d5db",
            }}
          />
        ))}
      </div>

      {/* Área visual — mockup */}
      <div className="flex-1 flex items-center justify-center px-6 py-4">
        <div
          className="w-full rounded-3xl overflow-hidden transition-all duration-300"
          style={{
            backgroundColor: "#e8e8ed",
            height: "340px",
            maxWidth: "360px",
          }}
        >
          {mockups[paso]}
        </div>
      </div>

      {/* Texto + CTA */}
      <div className="px-6 pb-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-gray-900 leading-tight">{slide.titulo}</h1>
          <p className="text-sm leading-relaxed text-gray-500 max-w-xs mx-auto">{slide.descripcion}</p>
        </div>

        <div className="space-y-2">
          <button
            onClick={siguiente}
            className="w-full py-4 rounded-full font-bold text-sm text-white tracking-wide transition-all active:scale-[0.97]"
            style={{ backgroundColor: "#000" }}
          >
            {slide.accion}
          </button>

          {paso < SLIDES.length - 1 && (
            <button
              onClick={saltar}
              className="w-full py-3 text-sm font-semibold text-gray-400"
            >
              Saltar intro
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
