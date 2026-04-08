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
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });

    if (error) {
      setError("Correo o contraseña incorrectos");
      setCargando(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col justify-end">
      <div className="text-white text-center pt-16 pb-10 px-6">
        <h1 className="text-3xl font-bold mb-1">Bienvenido</h1>
        <p className="text-primary-200 text-sm">Inicia sesión en tu cuenta</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-12">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Correo electrónico</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-primary-500 text-white font-semibold py-4 rounded-2xl hover:bg-primary-600 disabled:opacity-50 transition-colors mt-2"
          >
            {cargando ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-primary-500 font-semibold">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
