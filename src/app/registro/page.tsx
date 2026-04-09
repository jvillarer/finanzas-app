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
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-10 h-10 text-emerald-500" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Revisa tu correo</h1>
        <p className="text-gray-400 text-sm mb-8">
          Enviamos un enlace de confirmación a<br />
          <strong className="text-gray-600">{correo}</strong>
        </p>
        <Link
          href="/login"
          className="bg-primary-500 text-white font-semibold px-10 py-4 rounded-full text-sm shadow-lg shadow-primary-200"
        >
          Ir al inicio de sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col px-6">

      {/* Logo / ícono */}
      <div className="flex-1 flex flex-col items-center justify-center pb-4">
        <div className="w-20 h-20 bg-primary-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-primary-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" className="w-10 h-10" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h1.5m-1.5 0h-1.5m-9 0H4.5m1.5 0H4.5" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Crear cuenta</h1>
        <p className="text-gray-400 text-sm">Empieza a gestionar tus finanzas</p>
      </div>

      {/* Formulario */}
      <div className="pb-12">
        <form onSubmit={handleRegistro} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Nombre completo</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition"
            />
          </div>

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
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
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
            {cargando ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary-500 font-bold">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
