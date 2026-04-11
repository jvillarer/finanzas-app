"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const FEATURES = [
  {
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    titulo: "Solo díselo",
    subtitulo: "\"Gasté $300 en Uber\" y listo. Lani lo registra al instante.",
  },
  {
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
    titulo: "Foto de ticket",
    subtitulo: "Toma foto de cualquier recibo y Lani registra cada item automáticamente.",
  },
  {
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    titulo: "Entiende tu dinero",
    subtitulo: "Gráficas, límites por categoría y alertas antes de pasarte.",
  },
];

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/dashboard");
    };
    checkSession();
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col px-5 pt-16 pb-10" style={{ backgroundColor: "#f2f2f7" }}>

      {/* Hero */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-2xl shadow-md">
            🐑
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Lani</h1>
            <p className="text-xs text-gray-400 font-medium">Tu asistente financiera</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="mb-8">
          <h2 className="text-3xl font-black text-gray-900 leading-tight mb-3">
            Controla tu dinero<br />hablando con Lani
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Sin hojas de cálculo. Sin apps complicadas. Solo dile a Lani qué gastaste y ella hace el resto.
          </p>
        </div>

        {/* Chat preview */}
        <div className="bg-white rounded-3xl p-5 mb-6 shadow-sm" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center gap-2.5 mb-4 pb-3.5 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-base">🐑</div>
            <div>
              <p className="text-xs font-black text-gray-900">Lani</p>
              <p className="text-[10px] font-semibold text-green-500">● en línea</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0 mt-0.5">🐑</div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%]">
                <p className="text-xs text-gray-700 font-medium">Hola! Dime un gasto y te lo registro.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-black rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[80%]">
                <p className="text-xs text-white font-medium">Gasté $500 en el súper</p>
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0 mt-0.5">🐑</div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-[80%]">
                <p className="text-xs text-gray-700 font-medium">Listo ✓ Registré <span className="font-black text-green-600">$500</span> en Supermercado.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-2">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-3.5 bg-white rounded-2xl px-4 py-3.5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                {f.icono}
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 mb-0.5">{f.titulo}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{f.subtitulo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-8 space-y-2.5">
        <Link
          href="/registro"
          className="block w-full text-center font-bold py-4 rounded-full text-sm text-white tracking-wide transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#000" }}
        >
          Empezar gratis
        </Link>
        <Link
          href="/login"
          className="block w-full text-center font-semibold py-4 rounded-full text-sm tracking-wide transition-all active:scale-[0.98]"
          style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#374151" }}
        >
          Ya tengo cuenta
        </Link>
      </div>
    </main>
  );
}
