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
      <main className="min-h-screen bg-gradient-to-br from-[#2D2882] via-primary-500 to-[#7B5EA7] flex flex-col items-center justify-center px-6 text-center">
        <div className="glass w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-12 h-12" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Revisa tu correo</h1>
        <p className="text-white/60 text-sm mb-10 leading-relaxed">
          Enviamos un enlace de confirmación a<br />
          <strong className="text-white">{correo}</strong>
        </p>
        <Link
          href="/login"
          className="bg-white text-primary-600 font-bold px-10 py-4 rounded-2xl text-sm shadow-xl active:scale-95 transition-transform"
        >
          Ir al inicio de sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">

      {/* Parte superior con gradiente y logo */}
      <div className="bg-gradient-to-br from-[#2D2882] via-primary-500 to-[#7B5EA7] flex flex-col items-center justify-center pt-16 pb-16 px-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5" />

        {/* Ícono de app */}
        <div className="w-20 h-20 bg-white/15 backdrop-blur-sm border border-white/25 rounded-3xl flex items-center justify-center mb-5 shadow-2xl relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-10 h-10" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Crear cuenta</h1>
        <p className="text-white/60 text-sm mt-1">Empieza gratis hoy</p>
      </div>

      {/* Formulario */}
      <div className="flex-1 bg-white rounded-t-[2rem] -mt-6 px-6 pt-8 pb-12 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Registro</h2>
        <p className="text-gray-400 text-sm mb-7">Completa tus datos para comenzar</p>

        <form onSubmit={handleRegistro} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre completo</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full bg-[#F4F4F8] rounded-2xl px-4 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-300 transition placeholder:text-gray-300 text-gray-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Correo electrónico</label>
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
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
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
                Creando cuenta...
              </span>
            ) : "Registrarme"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-8">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary-500 font-bold">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
