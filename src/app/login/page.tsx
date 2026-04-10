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
    // Primer login → onboarding, regreso → dashboard
    const yaVioOnboarding = localStorage.getItem("lani_onboarding_done");
    if (yaVioOnboarding) {
      router.push("/dashboard");
    } else {
      router.push("/bienvenida");
    }
    router.refresh();
  };

  return (
    <main className="min-h-screen flex flex-col justify-between px-6 pt-20 pb-12" style={{ backgroundColor: "#111" }}>

      {/* Branding */}
      <div className="flex flex-col items-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 text-4xl"
          style={{ backgroundColor: "#22c55e", boxShadow: "0 0 40px rgba(34,197,94,0.25)" }}
        >
          🐑
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">Lani</h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>Tu asistente financiera</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm mx-auto">
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#6b7280" }}>Correo</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none text-white placeholder-gray-600"
              style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#6b7280" }}>Contraseña</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none text-white placeholder-gray-600"
              style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }}
            />
          </div>

          {error && <p className="text-xs font-semibold px-1" style={{ color: "#ef4444" }}>⚠ {error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full font-bold py-4 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            style={{ backgroundColor: "#22c55e", color: "#000" }}
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Entrando...
              </span>
            ) : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm mt-8" style={{ color: "#6b7280" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-bold text-white">Regístrate</Link>
        </p>
      </div>

      <div />
    </main>
  );
}
