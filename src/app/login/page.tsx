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
    const yaVioOnboarding = localStorage.getItem("lani_onboarding_done");
    if (yaVioOnboarding) {
      router.push("/dashboard");
    } else {
      router.push("/bienvenida");
    }
    router.refresh();
  };

  return (
    <main className="min-h-screen flex flex-col px-6" style={{ backgroundColor: "#f2f2f7" }}>

      {/* Top spacer */}
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pt-10">

        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl mb-4 shadow-lg overflow-hidden">
            <img src="/lani-hi.png" alt="Lani" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Bienvenido de vuelta</h1>
          <p className="text-sm text-gray-400 mt-1">Entra a tu cuenta de Lani</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 tracking-wide uppercase">Correo</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none bg-white text-gray-900 placeholder-gray-300 transition-all"
              style={{ border: "1.5px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 tracking-wide uppercase">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none bg-white text-gray-900 placeholder-gray-300 transition-all"
              style={{ border: "1.5px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full font-bold py-4 rounded-full text-sm text-white tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            style={{ backgroundColor: "#000" }}
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Entrando...
              </span>
            ) : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-gray-400">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-bold text-gray-900">Regístrate</Link>
        </p>
      </div>

      <div className="pb-10" />
    </main>
  );
}
