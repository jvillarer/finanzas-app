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
    <main className="min-h-screen bg-white flex flex-col px-6">

      {/* Logo / ícono */}
      <div className="flex-1 flex flex-col items-center justify-center pb-4">
        <div className="w-20 h-20 bg-primary-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-primary-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-10 h-10" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h1.5m-1.5 0h-1.5m-9 0H4.5m1.5 0H4.5" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Bienvenido</h1>
        <p className="text-gray-400 text-sm">Inicia sesión en tu cuenta</p>
      </div>

      {/* Formulario */}
      <div className="pb-12">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Correo electrónico</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition"
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-primary-500 text-white font-semibold py-4 rounded-full hover:bg-primary-600 active:scale-95 disabled:opacity-50 transition-all mt-2 text-sm shadow-lg shadow-primary-200"
          >
            {cargando ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-primary-500 font-bold">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
