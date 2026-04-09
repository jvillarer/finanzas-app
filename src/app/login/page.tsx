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
    <main className="min-h-screen flex flex-col justify-between px-6 pt-20 pb-12" style={{ backgroundColor: "#111" }}>

      {/* Branding */}
      <div className="flex flex-col items-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" className="w-10 h-10" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h1.5m-1.5 0h-1.5m-9 0H4.5m1.5 0H4.5" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">Mis Finanzas</h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>Control total de tu dinero</p>
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
