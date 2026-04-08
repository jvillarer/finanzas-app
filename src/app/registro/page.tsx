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
      options: {
        data: { nombre_completo: nombre },
      },
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
      <main className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">📬</div>
        <h1 className="text-2xl font-bold text-white mb-2">Revisa tu correo</h1>
        <p className="text-primary-200 text-sm mb-8">
          Te enviamos un enlace de confirmación a <strong>{correo}</strong>
        </p>
        <Link
          href="/login"
          className="bg-white text-primary-600 font-semibold px-8 py-3 rounded-2xl"
        >
          Ir al inicio de sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col justify-end">
      <div className="text-white text-center pt-16 pb-10 px-6">
        <h1 className="text-3xl font-bold mb-1">Crear cuenta</h1>
        <p className="text-primary-200 text-sm">Empieza a gestionar tus finanzas</p>
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-12">
        <form onSubmit={handleRegistro} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre completo</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

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
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
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
            {cargando ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary-500 font-semibold">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
