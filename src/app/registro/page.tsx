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
    if (contrasena.length < 6) { setError("Mínimo 6 caracteres"); return; }
    setCargando(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: { data: { nombre_completo: nombre } },
    });
    if (error) {
      setError(error.message === "User already registered" ? "Correo ya registrado" : "Error al crear cuenta");
      setCargando(false); return;
    }
    setExito(true); setCargando(false);
  };

  if (exito) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#111" }}>
        <div className="text-5xl mb-5">✉️</div>
        <h1 className="text-2xl font-black text-white mb-2">Revisa tu correo</h1>
        <p className="text-sm mb-8" style={{ color: "#6b7280" }}>
          Enviamos un enlace a <span className="text-white font-semibold">{correo}</span>
        </p>
        <Link href="/login" className="font-bold py-4 px-10 rounded-2xl text-sm" style={{ backgroundColor: "#22c55e", color: "#000" }}>
          Ir al login
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-between px-6 pt-20 pb-12" style={{ backgroundColor: "#111" }}>
      <div className="flex flex-col items-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" className="w-10 h-10" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">Crear cuenta</h1>
        <p className="text-sm" style={{ color: "#6b7280" }}>Empieza a controlar tu dinero</p>
      </div>

      <div className="w-full max-w-sm mx-auto">
        <form onSubmit={handleRegistro} className="space-y-3">
          {[
            { label: "Nombre", type: "text", ac: "name", ph: "Tu nombre", val: nombre, set: setNombre },
            { label: "Correo", type: "email", ac: "email", ph: "tucorreo@ejemplo.com", val: correo, set: setCorreo },
            { label: "Contraseña", type: "password", ac: "new-password", ph: "Mínimo 6 caracteres", val: contrasena, set: setContrasena },
          ].map(({ label, type, ac, ph, val, set }) => (
            <div key={label}>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#6b7280" }}>{label}</label>
              <input
                type={type} autoComplete={ac} placeholder={ph} value={val}
                onChange={(e) => set(e.target.value)} required
                className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none text-white placeholder-gray-600"
                style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }}
              />
            </div>
          ))}

          {error && <p className="text-xs font-semibold px-1" style={{ color: "#ef4444" }}>⚠ {error}</p>}

          <button
            type="submit" disabled={cargando}
            className="w-full font-bold py-4 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            style={{ backgroundColor: "#22c55e", color: "#000" }}
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="text-center text-sm mt-8" style={{ color: "#6b7280" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-white">Iniciar sesión</Link>
        </p>
      </div>
      <div />
    </main>
  );
}
