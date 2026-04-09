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
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#100C28" }}>

      {/* ── BRANDING SECTION ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-20 pb-8">
        {/* Logo */}
        <div
          className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, #534AB7 0%, #9B8FE8 100%)", boxShadow: "0 12px 32px rgba(83,74,183,0.5)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-9 h-9" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm3 0h1.5m-1.5 0h-1.5m-9 0H4.5m1.5 0H4.5" />
          </svg>
        </div>

        <h1 className="text-white text-3xl font-bold tracking-tight mb-1">Finanzas</h1>
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
          Control total de tu dinero
        </p>
      </div>

      {/* ── FORM SHEET ── */}
      <div
        className="bg-white px-6 pt-8 pb-12"
        style={{ borderTopLeftRadius: "2.5rem", borderTopRightRadius: "2.5rem" }}
      >
        <h2 className="text-2xl font-bold mb-1" style={{ color: "#100C28" }}>Iniciar sesión</h2>
        <p className="text-sm mb-8" style={{ color: "#9CA3AF" }}>Bienvenido de vuelta</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Correo */}
          <div>
            <label className="block text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9CA3AF" }}>
              Correo electrónico
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tucorreo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none transition"
              style={{
                backgroundColor: "#F4F3FA",
                color: "#100C28",
              }}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9CA3AF" }}>
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none transition"
              style={{
                backgroundColor: "#F4F3FA",
                color: "#100C28",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2.5" style={{ backgroundColor: "#FFF1F2" }}>
              <span style={{ color: "#FF4D6D" }}>⚠</span>
              <p className="text-xs font-semibold" style={{ color: "#FF4D6D" }}>{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 mt-2 text-sm tracking-wide"
            style={{
              backgroundColor: "#534AB7",
              boxShadow: "0 8px 24px rgba(83,74,183,0.35)",
            }}
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                Entrando...
              </span>
            ) : "Continuar"}
          </button>
        </form>

        <p className="text-center text-sm mt-8" style={{ color: "#9CA3AF" }}>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-bold" style={{ color: "#534AB7" }}>
            Regístrate gratis
          </Link>
        </p>
      </div>
    </main>
  );
}
