"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const OCUPACIONES = ["Empleado", "Independiente / Freelance", "Empresario", "Estudiante", "Ama/o de casa", "Otro"];
const OBJETIVOS = ["Ahorrar más", "Salir de deudas", "Controlar mis gastos", "Planear un proyecto", "Invertir", "Solo quiero ver mis finanzas"];
const PAISES = [
  "México", "Estados Unidos", "Argentina", "Colombia", "Chile", "España",
  "Perú", "Venezuela", "Ecuador", "Guatemala", "Cuba", "Bolivia",
  "República Dominicana", "Honduras", "Paraguay", "El Salvador",
  "Nicaragua", "Costa Rica", "Panamá", "Uruguay", "Otro",
];
const ESTADOS_MX = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
  "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima",
  "Durango", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco",
  "Estado de México", "Michoacán", "Morelos", "Nayarit", "Nuevo León",
  "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala",
  "Veracruz", "Yucatán", "Zacatecas",
];

function Dots({ paso }: { paso: number }) {
  return (
    <div className="flex gap-1.5 justify-center mb-8">
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: n === paso ? 24 : 6,
            backgroundColor: n <= paso ? "#000" : "#d1d5db",
          }} />
      ))}
    </div>
  );
}

function Campo({ label, type = "text", placeholder, value, onChange, autoComplete, required = true }: {
  label: string; type?: string; placeholder?: string; value: string;
  onChange: (v: string) => void; autoComplete?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5 tracking-wide uppercase">{label}</label>
      <input
        type={type} placeholder={placeholder} value={value} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none bg-white text-gray-900 placeholder-gray-300"
        style={{ border: "1.5px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
      />
    </div>
  );
}

function Dropdown({ label, opciones, valor, onSelect, placeholder = "Selecciona..." }: {
  label: string; opciones: string[]; valor: string;
  onSelect: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-1.5 tracking-wide uppercase">{label}</label>
      <select
        value={valor}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none appearance-none bg-white"
        style={{
          border: "1.5px solid rgba(0,0,0,0.08)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          color: valor ? "#111827" : "#9ca3af",
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {opciones.map((op) => <option key={op} value={op}>{op}</option>)}
      </select>
    </div>
  );
}

function ChipSelect({ label, opciones, valor, onSelect }: {
  label: string; opciones: string[]; valor: string; onSelect: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 mb-2.5 tracking-wide uppercase">{label}</label>
      <div className="flex flex-wrap gap-2">
        {opciones.map((op) => (
          <button key={op} type="button" onClick={() => onSelect(op)}
            className="px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
            style={{
              backgroundColor: valor === op ? "#000" : "#fff",
              border: valor === op ? "1.5px solid #000" : "1.5px solid rgba(0,0,0,0.1)",
              color: valor === op ? "#fff" : "#4b5563",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >{op}</button>
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
  const [correoExiste, setCorreoExiste] = useState(false);
  const [exito, setExito] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");

  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("");
  const [pais, setPais] = useState("");
  const [estado, setEstado] = useState("");
  const [ocupacion, setOcupacion] = useState("");

  const [ingresoMensual, setIngresoMensual] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const validarPaso1 = () => {
    if (!nombre.trim()) { setError("Ingresa tu nombre"); return false; }
    if (!correo.includes("@")) { setError("Correo inválido"); return false; }
    if (contrasena.length < 6) { setError("La contraseña debe tener mínimo 6 caracteres"); return false; }
    if (contrasena !== confirmarContrasena) { setError("Las contraseñas no coinciden"); return false; }
    return true;
  };

  const validarPaso2 = () => {
    if (!edad || isNaN(Number(edad)) || Number(edad) < 13 || Number(edad) > 99) {
      setError("Ingresa una edad válida"); return false;
    }
    if (!sexo) { setError("Selecciona tu sexo"); return false; }
    return true;
  };

  const siguientePaso1 = async () => {
    if (!validarPaso1()) return;
    setCargando(true);
    setError("");
    setCorreoExiste(false);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: { data: { nombre_completo: nombre } },
    });
    setCargando(false);
    if (authError) {
      if (authError.message.toLowerCase().includes("rate limit") || authError.message.toLowerCase().includes("email rate")) {
        setError("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
      } else if (authError.message.toLowerCase().includes("already registered") || authError.message.toLowerCase().includes("already exists")) {
        setError("Este correo ya tiene una cuenta.");
        setCorreoExiste(true);
      } else {
        setError(authError.message);
      }
      return;
    }
    if (data?.user && data.user.identities?.length === 0) {
      setError("Este correo ya tiene una cuenta.");
      setCorreoExiste(true);
      return;
    }
    if (data?.user?.id) setUserId(data.user.id);
    setPaso(2);
  };

  const siguiente = () => {
    setError("");
    if (paso === 2 && !validarPaso2()) return;
    setPaso((p) => p + 1);
  };

  const handleRegistro = async () => {
    if (!ingresoMensual) { setError("Selecciona tu ingreso mensual"); return; }
    if (!objetivo) { setError("Selecciona tu objetivo principal"); return; }
    setCargando(true);
    setError("");
    const supabase = createClient();
    const ubicacion = pais === "México" && estado ? `${estado}, México` : pais;
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (uid) {
      await supabase.from("perfiles").upsert({
        id: uid, nombre_completo: nombre, edad: Number(edad), sexo,
        ciudad: ubicacion, ocupacion, ingreso_mensual_rango: ingresoMensual,
        objetivo_financiero: objetivo,
      });
    }
    setExito(true);
    setCargando(false);
  };

  if (exito) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#f2f2f7" }}>
        <div className="w-20 h-20 rounded-2xl mb-6 shadow-lg overflow-hidden">
          <img src="/lani-happy.png" alt="Lani" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">¡Ya somos equipo, {nombre.split(" ")[0]}!</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-1 max-w-xs">
          Te mandé un link de confirmación a
        </p>
        <p className="font-bold text-gray-900 text-sm mb-8">{correo}</p>
        <div className="w-full max-w-xs space-y-3 mb-8">
          {[{ num: "1", texto: "Confirma tu correo" }, { num: "2", texto: "Entra a la app" }, { num: "3", texto: "Dime tu primer gasto" }].map((item) => (
            <div key={item.num} className="flex items-center gap-3 text-left bg-white rounded-2xl px-4 py-3.5" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-xs font-black text-white shrink-0">
                {item.num}
              </div>
              <p className="text-sm font-semibold text-gray-800">{item.texto}</p>
            </div>
          ))}
        </div>
        <button onClick={() => router.push("/onboarding")}
          className="w-full max-w-xs font-bold py-4 rounded-full text-sm text-white tracking-wide transition-all active:scale-[0.98]"
          style={{ backgroundColor: "#000" }}>
          Entrar a Lani
        </button>
      </main>
    );
  }

  const titulos = ["Crea tu cuenta", "Cuéntame de ti", "Tu situación financiera"];
  const subtitulos = [
    "En 2 minutos empezamos a controlar tu lana.",
    `Mucho gusto, ${nombre.split(" ")[0] || ""}! Esto me ayuda a personalizarme para ti.`,
    "Con esto puedo darte consejos reales para tu bolsillo.",
  ];

  return (
    <main className="min-h-screen px-5 pt-12 pb-10" style={{ backgroundColor: "#f2f2f7" }}>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {paso > 1 ? (
          <button
            onClick={() => { setError(""); setCorreoExiste(false); setPaso((p) => p - 1); }}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          >
            <svg viewBox="0 0 20 20" fill="#374151" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden">
            <img src="/lani-hi.png" alt="Lani" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Paso {paso} de 3</p>
          <h1 className="text-xl font-black text-gray-900">{titulos[paso - 1]}</h1>
        </div>
      </div>

      <Dots paso={paso} />

      {/* Hint de Lani */}
      <div className="bg-white rounded-2xl px-4 py-3.5 mb-5 flex items-start gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <img src="/lani-hi.png" alt="Lani" className="shrink-0 mt-0.5" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
        <p className="text-xs text-gray-500 leading-relaxed">{subtitulos[paso - 1]}</p>
      </div>

      <div className="space-y-4">

        {/* PASO 1 */}
        {paso === 1 && (
          <>
            <Campo label="Nombre completo" placeholder="Tu nombre completo" value={nombre} onChange={setNombre} autoComplete="name" />
            <Campo label="Correo" type="email" placeholder="tucorreo@ejemplo.com" value={correo} onChange={(v) => { setCorreo(v); setCorreoExiste(false); setError(""); }} autoComplete="email" />
            <Campo label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={contrasena} onChange={setContrasena} autoComplete="new-password" />
            <Campo label="Confirmar contraseña" type="password" placeholder="Repite tu contraseña" value={confirmarContrasena} onChange={setConfirmarContrasena} autoComplete="new-password" />
          </>
        )}

        {/* PASO 2 */}
        {paso === 2 && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 tracking-wide uppercase">Edad</label>
              <input type="number" inputMode="numeric" placeholder="Ej. 28"
                value={edad} onChange={(e) => setEdad(e.target.value)} min={13} max={99}
                className="w-full rounded-2xl px-4 py-4 text-sm font-medium outline-none bg-white text-gray-900 placeholder-gray-300"
                style={{ border: "1.5px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }} />
            </div>
            <ChipSelect label="Sexo" opciones={["Hombre", "Mujer"]} valor={sexo} onSelect={setSexo} />
            <Dropdown label="País" opciones={PAISES} valor={pais} onSelect={(v) => { setPais(v); setEstado(""); }} placeholder="Selecciona tu país" />
            {pais === "México" && (
              <Dropdown label="Estado" opciones={ESTADOS_MX} valor={estado} onSelect={setEstado} placeholder="Selecciona tu estado" />
            )}
            <ChipSelect label="Ocupación" opciones={OCUPACIONES} valor={ocupacion} onSelect={setOcupacion} />
          </>
        )}

        {/* PASO 3 */}
        {paso === 3 && (
          <>
            <ChipSelect
              label="Ingreso mensual aproximado"
              opciones={["Menos de $10k", "$10k–$20k", "$20k–$40k", "$40k–$80k", "Más de $80k"]}
              valor={ingresoMensual} onSelect={setIngresoMensual}
            />
            <ChipSelect
              label="¿Cuál es tu objetivo principal?"
              opciones={OBJETIVOS} valor={objetivo} onSelect={setObjetivo}
            />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-xs font-semibold text-red-600">{error}</p>
          </div>
          {correoExiste && (
            <button
              onClick={() => router.push("/login")}
              className="mt-3 w-full font-bold py-4 rounded-full text-sm tracking-wide transition-all active:scale-[0.98] bg-white text-gray-900"
              style={{ border: "1.5px solid rgba(0,0,0,0.1)", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
            >
              Iniciar sesión →
            </button>
          )}
        </div>
      )}

      {/* Botón principal */}
      <div className="mt-6">
        {paso < 3 ? (
          <button
            onClick={paso === 1 ? siguientePaso1 : siguiente}
            disabled={cargando}
            className="w-full font-bold py-4 rounded-full text-sm text-white tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "#000" }}
          >
            {cargando && paso === 1 ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Verificando...
              </span>
            ) : "Continuar"}
          </button>
        ) : (
          <button onClick={handleRegistro} disabled={cargando}
            className="w-full font-bold py-4 rounded-full text-sm text-white tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: "#000" }}>
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : "Crear mi cuenta"}
          </button>
        )}
      </div>

      <p className="text-center text-sm mt-5 text-gray-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-bold text-gray-900">Iniciar sesión</Link>
      </p>
    </main>
  );
}
