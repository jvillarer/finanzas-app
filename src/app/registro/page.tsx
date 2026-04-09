"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCargando(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: { data: { nombre_completo: nombre } },
    });

    if (error) {
      setError(error.message === "User already registered"
        ? "Este correo ya está registrado"
        : "Error al crear cuenta, intenta de nuevo"
      );
      setCargando(false);
      return;
    }

    setExito(true);
    setCargando(false);
  };

  if (exito) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#100C28" }}>
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-7"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-12 h-12" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-white text-2xl font-bold mb-2 tracking-tight">Revisa tu correo</h1>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
          Enviamos un enlace de confirmación a<br />
          <span className="text-white font-semibold">{correo}</span>
        </p>
        <Link
          href="/login"
          className="text-white font-bold px-10 py-4 rounded-2xl text-sm active:scale-95 transition-transform"
          style={{ backgroundColor: "#534AB7", boxShadow: "0 8px 24px rgba(83,74,183,0.4)" }}
        >
          Ir al inicio de sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#100C28" }}>

      {/* ── BRANDING ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-20 pb-8">
        <div
          className="w-[72px] h-[72px] rounded-[22px] flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, #534AB7 0%, #9B8FE8 100%)", boxShadow: "0 12px 32px rgba(83,74,183,0.5)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-9 h-9" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>

        <h1 className="text-white text-3xl font-bold tracking-tight mb-1">Crear cuenta</h1>
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
          Empieza gratis hoy
        </p>
      </div>

      {/* ── FORM SHEET ── */}
      <div
        className="bg-white px-6 pt-8 pb-12"
        style={{ borderTopLeftRadius: "2.5rem", borderTopRightRadius: "2.5rem" }}
      >
        <h2 className="text-2xl font-bold mb-1" style={{ color: "#100C28" }}>Registro</h2>
        <p className="text-sm mb-8" style={{ color: "#9CA3AF" }}>Completa tus datos para comenzar</p>

        <form onSubmit={handleRegistro} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9CA3AF" }}>
              Nombre completo
            </label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none transition"
              style={{ backgroundColor: "#F4F3FA", color: "#100C28" }}
            />
          </div>

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
              style={{ backgroundColor: "#F4F3FA", color: "#100C28" }}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#9CA3AF" }}>
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none transition"
              style={{ backgroundColor: "#F4F3FA", color: "#100C28" }}
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
                Creando cuenta...
              </span>
            ) : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-sm mt-8" style={{ color: "#9CA3AF" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold" style={{ color: "#534AB7" }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
