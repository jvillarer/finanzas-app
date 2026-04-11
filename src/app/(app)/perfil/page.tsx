"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";

const OCUPACIONES = ["Empleado", "Independiente / Freelance", "Empresario", "Estudiante", "Ama/o de casa", "Otro"];
const INGRESOS = ["Menos de $10k", "$10k–$20k", "$20k–$40k", "$40k–$80k", "Más de $80k"];
const OBJETIVOS = ["Ahorrar más", "Salir de deudas", "Controlar mis gastos", "Planear un proyecto", "Invertir", "Solo quiero ver mis finanzas"];
const SEXOS = ["Hombre", "Mujer"];

function ChipSelect({ opciones, valor, onSelect }: { opciones: string[]; valor: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => (
        <button
          key={op} type="button" onClick={() => onSelect(op)}
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
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-400 mb-1.5 tracking-wide uppercase">{label}</label>
      {children}
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <p className="text-xs font-bold text-gray-900 text-right max-w-[55%]">{valor}</p>
    </div>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState({ ingresos: 0, gastos: 0, balance: 0 });
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [ingresoRango, setIngresoRango] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [iniciales, setIniciales] = useState("?");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const m = user.user_metadata || {};
        setCorreo(user.email || "");
        setNombre(m.nombre_completo || "");
        setEdad(m.edad ? String(m.edad) : "");
        setSexo(m.sexo || "");
        setCiudad(m.ciudad || "");
        setOcupacion(m.ocupacion || "");
        setIngresoRango(m.ingreso_mensual || "");
        setObjetivo(m.objetivo_financiero || "");
        const n = m.nombre_completo || "";
        setIniciales(n ? n.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() : "?");
      }
      const txs = await obtenerTransacciones();
      setResumen(calcularResumen(txs));
    })();
  }, []);

  const guardar = async () => {
    setGuardando(true);
    const supabase = createClient();
    const metadata = {
      nombre_completo: nombre, edad: Number(edad), sexo, ciudad,
      ocupacion, ingreso_mensual: ingresoRango, objetivo_financiero: objetivo,
    };
    await supabase.auth.updateUser({ data: metadata });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("perfiles").upsert({
        id: user.id, nombre_completo: nombre, edad: Number(edad), sexo, ciudad,
        ocupacion, ingreso_mensual_rango: ingresoRango, objetivo_financiero: objetivo,
      });
    }
    const n = nombre;
    setIniciales(n ? n.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase() : "?");
    setGuardando(false);
    setEditando(false);
  };

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const eliminarCuenta = async () => {
    setEliminandoCuenta(true);
    try {
      const res = await fetch("/api/eliminar-cuenta", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ocurrió un error al eliminar tu cuenta.");
        setEliminandoCuenta(false);
        setConfirmarEliminar(false);
        return;
      }
      localStorage.removeItem("lani_onboarding_done");
      localStorage.removeItem("lani_chat_mensajes");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      alert("Error de conexión. Intenta de nuevo.");
      setEliminandoCuenta(false);
    }
  };

  return (
    <main className="min-h-screen px-4 pt-14 pb-10" style={{ backgroundColor: "#f2f2f7" }}>

      {/* Avatar + nombre */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-2xl bg-black flex items-center justify-center text-2xl font-black text-white mb-3 shadow-lg">
          {iniciales}
        </div>
        <h1 className="text-xl font-black text-gray-900">{nombre || "Mi cuenta"}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{correo}</p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-3xl overflow-hidden mb-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {[
          { label: "Balance", valor: formatearMonto(resumen.balance), color: resumen.balance >= 0 ? "#16a34a" : "#dc2626" },
          { label: "Ingresos", valor: formatearMonto(resumen.ingresos), color: "#16a34a" },
          { label: "Gastos", valor: formatearMonto(resumen.gastos), color: "#dc2626" },
        ].map(({ label, valor, color }, i) => (
          <div key={label} className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: i > 0 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
            <p className="text-sm font-semibold text-gray-400">{label}</p>
            <p className="text-sm font-black" style={{ color }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Perfil */}
      {!editando ? (
        <div className="bg-white rounded-3xl overflow-hidden mb-4" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-black text-gray-900">Mi perfil</p>
            <button
              onClick={() => setEditando(true)}
              className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-gray-100 text-gray-700"
            >
              Editar
            </button>
          </div>
          <div className="px-5">
            <Fila label="Edad" valor={edad ? `${edad} años` : "—"} />
            <Fila label="Sexo" valor={sexo || "—"} />
            <Fila label="Ciudad" valor={ciudad || "—"} />
            <Fila label="Ocupación" valor={ocupacion || "—"} />
            <Fila label="Ingreso mensual" valor={ingresoRango || "—"} />
            <Fila label="Objetivo" valor={objetivo || "—"} />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 mb-4 space-y-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p className="text-sm font-black text-gray-900">Editar perfil</p>

          <Campo label="Nombre completo">
            <input
              type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none bg-gray-50 text-gray-900 placeholder-gray-300"
              style={{ border: "1.5px solid rgba(0,0,0,0.08)" }}
            />
          </Campo>

          <Campo label="Edad">
            <input
              type="number" inputMode="numeric" value={edad} onChange={(e) => setEdad(e.target.value)}
              placeholder="Ej. 28"
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none bg-gray-50 text-gray-900 placeholder-gray-300"
              style={{ border: "1.5px solid rgba(0,0,0,0.08)" }}
            />
          </Campo>

          <Campo label="Sexo">
            <ChipSelect opciones={SEXOS} valor={sexo} onSelect={setSexo} />
          </Campo>

          <Campo label="Ciudad">
            <input
              type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ej. CDMX, Monterrey..."
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none bg-gray-50 text-gray-900 placeholder-gray-300"
              style={{ border: "1.5px solid rgba(0,0,0,0.08)" }}
            />
          </Campo>

          <Campo label="Ocupación">
            <ChipSelect opciones={OCUPACIONES} valor={ocupacion} onSelect={setOcupacion} />
          </Campo>

          <Campo label="Ingreso mensual">
            <ChipSelect opciones={INGRESOS} valor={ingresoRango} onSelect={setIngresoRango} />
          </Campo>

          <Campo label="Objetivo financiero">
            <ChipSelect opciones={OBJETIVOS} valor={objetivo} onSelect={setObjetivo} />
          </Campo>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setEditando(false)}
              className="flex-1 py-3.5 rounded-full text-sm font-bold bg-gray-100 text-gray-500"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 py-3.5 rounded-full text-sm font-bold text-white disabled:opacity-50 bg-black"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Cerrar sesión */}
      <button
        onClick={cerrarSesion}
        className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] mb-2 bg-white"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.1)" }}
      >
        Cerrar sesión
      </button>

      {/* Eliminar cuenta */}
      {!confirmarEliminar ? (
        <button
          onClick={() => setConfirmarEliminar(true)}
          className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-300"
        >
          Eliminar cuenta
        </button>
      ) : (
        <div className="bg-white rounded-3xl p-5 space-y-4 mt-1" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid rgba(220,38,38,0.12)" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 mb-1">¿Eliminar tu cuenta?</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Esta acción es permanente. Se borrarán todas tus transacciones, historial y perfil. No se puede deshacer.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmarEliminar(false)}
              disabled={eliminandoCuenta}
              className="flex-1 py-3.5 rounded-full text-sm font-bold bg-gray-100 text-gray-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={eliminarCuenta}
              disabled={eliminandoCuenta}
              className="flex-1 py-3.5 rounded-full text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
            >
              {eliminandoCuenta ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                  Eliminando...
                </span>
              ) : "Sí, eliminar todo"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
