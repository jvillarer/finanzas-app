"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

// ── Paso 1: cuenta
// ── Paso 2: perfil personal
// ── Paso 3: contexto financiero

const OCUPACIONES = [
  "Empleado",
  "Independiente / Freelance",
  "Empresario",
  "Estudiante",
  "Ama/o de casa",
  "Otro",
];

const OBJETIVOS = [
  "Ahorrar más",
  "Salir de deudas",
  "Controlar mis gastos",
  "Planear un proyecto",
  "Invertir",
  "Solo quiero ver mis finanzas",
];

function Barra({ paso }: { paso: number }) {
  return (
    <div className="flex gap-2 justify-center mb-8">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-1 rounded-full transition-all"
          style={{
            width: paso === n ? 32 : 16,
            backgroundColor: n <= paso ? "#22c55e" : "rgba(255,255,255,0.1)",
          }}
        />
      ))}
    </div>
  );
}

function Campo({
  label, type = "text", placeholder, value, onChange, autoComplete, required = true,
}: {
  label: string; type?: string; placeholder?: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#6b7280" }}>
        {label}
      </label>
      <input
        type={type} placeholder={placeholder} value={value} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none text-white placeholder-gray-600"
        style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }}
      />
    </div>
  );
}

function ChipSelect({
  label, opciones, valor, onSelect,
}: {
  label: string; opciones: string[]; valor: string; onSelect: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "#6b7280" }}>
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {opciones.map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => onSelect(op)}
            className="px-3 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95"
            style={{
              backgroundColor: valor === op ? "rgba(34,197,94,0.15)" : "#1c1c1c",
              border: valor === op ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.07)",
              color: valor === op ? "#22c55e" : "#9ca3af",
            }}
          >
            {op}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RegistroPage() {
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  // Paso 1
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");

  // Paso 2
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ocupacion, setOcupacion] = useState("");

  // Paso 3
  const [ingresoMensual, setIngresoMensual] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const validarPaso1 = () => {
    if (!nombre.trim()) { setError("Ingresa tu nombre"); return false; }
    if (!correo.includes("@")) { setError("Correo inválido"); return false; }
    if (contrasena.length < 6) { setError("Contraseña mínimo 6 caracteres"); return false; }
    return true;
  };

  const validarPaso2 = () => {
    if (!edad || isNaN(Number(edad)) || Number(edad) < 13 || Number(edad) > 99) {
      setError("Ingresa una edad válida"); return false;
    }
    if (!sexo) { setError("Selecciona una opción"); return false; }
    return true;
  };

  const siguiente = () => {
    setError("");
    if (paso === 1 && !validarPaso1()) return;
    if (paso === 2 && !validarPaso2()) return;
    setPaso((p) => p + 1);
  };

  const handleRegistro = async () => {
    setCargando(true);
    setError("");
    const supabase = createClient();

    const metadata = {
      nombre_completo: nombre,
      edad: Number(edad),
      sexo,
      ciudad,
      ocupacion,
      ingreso_mensual: ingresoMensual,
      objetivo_financiero: objetivo,
    };

    const { error: authError } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: { data: metadata },
    });

    if (authError) {
      setError(authError.message === "User already registered" ? "Correo ya registrado" : "Error al crear cuenta");
      setCargando(false);
      return;
    }

    // Guardar perfil extendido en tabla perfiles
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("perfiles").upsert({
        id: user.id,
        nombre_completo: nombre,
        edad: Number(edad),
        sexo,
        ciudad,
        ocupacion,
        ingreso_mensual_rango: ingresoMensual,
        objetivo_financiero: objetivo,
      });
    }

    setExito(true);
    setCargando(false);
  };

  if (exito) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#111" }}>
        <div className="text-6xl mb-5">🐑</div>
        <h1 className="text-2xl font-black text-white mb-2">¡Bienvenido/a, {nombre.split(" ")[0]}!</h1>
        <p className="text-sm mb-2" style={{ color: "#6b7280" }}>
          Enviamos un enlace de confirmación a
        </p>
        <p className="text-white font-semibold text-sm mb-8">{correo}</p>
        <Link
          href="/login"
          className="font-bold py-4 px-10 rounded-2xl text-sm"
          style={{ backgroundColor: "#22c55e", color: "#000" }}
        >
          Ir al login
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col px-6 pt-14 pb-12" style={{ backgroundColor: "#111" }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {paso > 1 && (
          <button
            onClick={() => { setError(""); setPaso((p) => p - 1); }}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#1c1c1c" }}
          >
            <svg viewBox="0 0 20 20" fill="#6b7280" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#6b7280" }}>
            Paso {paso} de 3
          </p>
          <h1 className="text-xl font-black text-white">
            {paso === 1 ? "Crea tu cuenta" : paso === 2 ? "Cuéntanos de ti" : "Tu situación financiera"}
          </h1>
        </div>
      </div>

      <Barra paso={paso} />

      <div className="flex-1 space-y-4">

        {/* ── PASO 1: Cuenta ── */}
        {paso === 1 && (
          <>
            <Campo label="Nombre completo" placeholder="Tu nombre completo" value={nombre} onChange={setNombre} autoComplete="name" />
            <Campo label="Correo" type="email" placeholder="tucorreo@ejemplo.com" value={correo} onChange={setCorreo} autoComplete="email" />
            <Campo label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={contrasena} onChange={setContrasena} autoComplete="new-password" />
          </>
        )}

        {/* ── PASO 2: Perfil personal ── */}
        {paso === 2 && (
          <>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#6b7280" }}>Edad</label>
              <input
                type="number" inputMode="numeric" placeholder="Ej. 28"
                value={edad} onChange={(e) => setEdad(e.target.value)} min={13} max={99}
                className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none text-white placeholder-gray-600"
                style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.07)" }}
              />
            </div>

            <ChipSelect
              label="Sexo"
              opciones={["Masculino", "Femenino", "Prefiero no decir"]}
              valor={sexo}
              onSelect={setSexo}
            />

            <Campo label="Ciudad (opcional)" placeholder="Ej. CDMX, Monterrey..." value={ciudad} onChange={setCiudad} required={false} />

            <ChipSelect
              label="Ocupación"
              opciones={OCUPACIONES}
              valor={ocupacion}
              onSelect={setOcupacion}
            />
          </>
        )}

        {/* ── PASO 3: Situación financiera ── */}
        {paso === 3 && (
          <>
            <ChipSelect
              label="Ingreso mensual aproximado"
              opciones={["Menos de $10k", "$10k–$20k", "$20k–$40k", "$40k–$80k", "Más de $80k"]}
              valor={ingresoMensual}
              onSelect={setIngresoMensual}
            />

            <ChipSelect
              label="¿Cuál es tu objetivo principal?"
              opciones={OBJETIVOS}
              valor={objetivo}
              onSelect={setObjetivo}
            />

            <div
              className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}
            >
              <span className="text-xl shrink-0 mt-0.5">🐑</span>
              <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
                Esta info ayuda a Lani a darte mejores consejos financieros personalizados para ti.
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs font-semibold mt-4" style={{ color: "#ef4444" }}>⚠ {error}</p>
      )}

      {/* Botón */}
      <div className="mt-6">
        {paso < 3 ? (
          <button
            onClick={siguiente}
            className="w-full font-bold py-4 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#22c55e", color: "#000" }}
          >
            Continuar →
          </button>
        ) : (
          <button
            onClick={handleRegistro}
            disabled={cargando}
            className="w-full font-bold py-4 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "#22c55e", color: "#000" }}
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Creando cuenta...
              </span>
            ) : "Crear mi cuenta"}
          </button>
        )}

        {paso === 3 && (
          <button
            onClick={handleRegistro}
            disabled={cargando}
            className="w-full py-3 mt-2 text-sm font-semibold transition-all"
            style={{ color: "#6b7280" }}
          >
            Omitir este paso
          </button>
        )}
      </div>

      <p className="text-center text-sm mt-6" style={{ color: "#6b7280" }}>
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-bold text-white">Iniciar sesión</Link>
      </p>
    </main>
  );
}
