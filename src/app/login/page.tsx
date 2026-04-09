"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
    if (error) {
      setError("Correo o contraseña incorrectos");
      setCargando(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Parte superior con gradiente y logo */}
      <div className="bg-gradient-to-br from-[#2D2882] via-primary-500 to-[#7B5EA7] flex flex-col items-center justify-center pt-20 pb-16 px-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5" />

        {/* Ícono de app */}
        <div className="w-20 h-20 bg-white/15 backdrop-blur-sm border border-white/25 rounded-3xl flex items-center justify-center mb-5 shadow-2xl relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-10 h-10" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h1.5m-1.5 0h-1.5m-9 0H4.5m1.5 0H4.5" />
          </svg>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Finanzas App</h1>
        <p className="text-white/60 text-sm mt-1">Tus finanzas bajo control</p>
      </div>

      {/* Formulario */}
      <div className="flex-1 bg-white rounded-t-[2rem] -mt-6 px-6 pt-8 pb-12 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Iniciar sesión</h2>
        <p className="text-gray-400 text-sm mb-7">Bienvenido de vuelta</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Correo</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="w-full bg-[#F4F4F8] rounded-2xl px-4 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-300 transition placeholder:text-gray-300 text-gray-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full bg-[#F4F4F8] rounded-2xl px-4 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-300 transition placeholder:text-gray-300 text-gray-800"
            />
          </div>

          {error && (
            <div className="bg-red-50 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-red-400 text-sm">⚠</span>
              <p className="text-red-500 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-primary-200 mt-2 text-sm tracking-wide"
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Entrando...
              </span>
            ) : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-8">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-primary-500 font-bold">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </main>
  );
}
