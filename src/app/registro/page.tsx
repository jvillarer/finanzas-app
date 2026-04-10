"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  // Crea la cuenta en paso 1 para detectar duplicados inmediatamente
  const siguientePaso1 = async () => {
    if (!validarPaso1()) return;
    setCargando(true);
    setError("");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: { data: { nombre_completo: nombre } },
    });
    setCargando(false);
    if (authError) {
      setError("Error al crear cuenta. Intenta de nuevo.");
      return;
    }
    if (data?.user && data.user.identities?.length === 0) {
      setError("Este correo ya tiene una cuenta. ¿Quieres iniciar sesión?");
      return;
    }
    setPaso(2);
  };

  const siguiente = () => {
    setError("");
    if (paso === 2 && !validarPaso2()) return;
    setPaso((p) => p + 1);
  };

  // En paso 3 solo guarda el perfil (cuenta ya creada en paso 1)
  const handleRegistro = async () => {
    setCargando(true);
    setError("");
    const supabase = createClient();
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
      // Actualizar metadata con perfil completo
      await supabase.auth.updateUser({
        data: { nombre_completo: nombre, edad: Number(edad), sexo, ciudad, ocupacion, ingreso_mensual: ingresoMensual, objetivo_financiero: objetivo },
      });
    }
    setExito(true);
    setCargando(false);
  };

  if (exito) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#111" }}>
        {/* Avatar animado */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-6"
          style={{ backgroundColor: "#22c55e", boxShadow: "0 0 60px rgba(34,197,94,0.3)" }}
        >
          🐑
        </div>

        <h1 className="text-2xl font-black text-white mb-2">
          ¡Ya somos equipo, {nombre.split(" ")[0]}!
        </h1>
        <p className="text-sm leading-relaxed mb-2 max-w-xs" style={{ color: "#6b7280" }}>
          Revisé tu correo — te mandé un link de confirmación a
        </p>
        <p className="font-bold text-white text-sm mb-8">{correo}</p>

        {/* Pasos rápidos */}
        <div className="w-full max-w-xs space-y-3 mb-8">
          {[
            { num: "1", texto: "Confirma tu correo" },
            { num: "2", texto: "Entra a la app" },
            { num: "3", texto: "Dime tu primer gasto" },
          ].map((item) => (
            <div key={item.num} className="flex items-center gap-3 text-left">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                style={{ backgroundColor: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                {item.num}
              </div>
              <p className="text-sm font-semibold text-white">{item.texto}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push("/bienvenida")}
          className="w-full max-w-xs font-bold py-4 rounded-2xl text-sm text-center block transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#22c55e", color: "#000" }}
        >
          Entrar a Lani
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 pt-14 pb-12" style={{ backgroundColor: "#111" }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        {paso > 1 ? (
          <button
            onClick={() => { setError(""); setPaso((p) => p - 1); }}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#1c1c1c" }}
          >
            <svg viewBox="0 0 20 20" fill="#6b7280" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: "#22c55e" }}>🐑</div>
        )}
        <div>
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#6b7280" }}>
            {paso} de 3
          </p>
          <h1 className="text-xl font-black text-white">
            {paso === 1 ? "Hola, soy Lani" : paso === 2 ? "Cuéntame de ti" : "Tu situación financiera"}
          </h1>
        </div>
      </div>

      <Barra paso={paso} />

      {/* Mensaje de Lani por paso */}
      <div
        className="rounded-2xl px-4 py-3 mb-5 flex items-start gap-3"
        style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}
      >
        <span className="text-base shrink-0 mt-0.5">🐑</span>
        <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
          {paso === 1 && "¡Qué bueno que estás aquí! Crea tu cuenta y en 2 minutos empezamos a controlar tu lana juntos."}
          {paso === 2 && `Mucho gusto, ${nombre.split(" ")[0] || ""}! Mientras más me cuentes, mejor puedo ayudarte. Esto es solo entre tú y yo.`}
          {paso === 3 && "Último paso. Con esto puedo darte consejos que sí tienen sentido para tu bolsillo, no genéricos."}
        </p>
      </div>

      <div className="space-y-4">

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
      <div className="mt-8">
        {paso < 3 ? (
          <button
            onClick={paso === 1 ? siguientePaso1 : siguiente}
            disabled={cargando}
            className="w-full font-bold py-4 rounded-2xl text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "#22c55e", color: "#000" }}
          >
            {cargando && paso === 1 ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Verificando...
              </span>
            ) : "Continuar →"}
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
