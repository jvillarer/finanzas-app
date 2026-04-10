"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";

const OCUPACIONES = ["Empleado", "Independiente / Freelance", "Empresario", "Estudiante", "Ama/o de casa", "Otro"];
const INGRESOS = ["Menos de $10k", "$10k–$20k", "$20k–$40k", "$40k–$80k", "Más de $80k"];
const OBJETIVOS = ["Ahorrar más", "Salir de deudas", "Controlar mis gastos", "Planear un proyecto", "Invertir", "Solo quiero ver mis finanzas"];

function ChipSelect({ opciones, valor, onSelect }: { opciones: string[]; valor: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => (
        <button
          key={op} type="button" onClick={() => onSelect(op)}
          className="px-3 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95"
          style={{
            backgroundColor: valor === op ? "rgba(34,197,94,0.15)" : "#222",
            border: valor === op ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.06)",
            color: valor === op ? "#22c55e" : "#9ca3af",
          }}
        >
          {op}
        </button>
      ))}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "#6b7280" }}>{label}</label>
      {children}
    </div>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState({ ingresos: 0, gastos: 0, balance: 0 });

  // Datos del perfil
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

  return (
    <main className="min-h-screen px-5 pt-14 pb-10" style={{ backgroundColor: "#111" }}>

      {/* Avatar + nombre */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white mb-3"
          style={{ backgroundColor: "#1c1c1c", border: "2px solid rgba(255,255,255,0.08)" }}
        >
          {iniciales}
        </div>
        <h1 className="text-xl font-black text-white">{nombre || "Mi cuenta"}</h1>
        <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{correo}</p>
      </div>

      {/* Stats */}
      <div className="rounded-3xl overflow-hidden mb-5" style={{ backgroundColor: "#1c1c1c" }}>
        {[
          { label: "Balance", valor: formatearMonto(resumen.balance), color: resumen.balance >= 0 ? "#22c55e" : "#ef4444" },
          { label: "Ingresos", valor: formatearMonto(resumen.ingresos), color: "#22c55e" },
          { label: "Gastos", valor: formatearMonto(resumen.gastos), color: "#ef4444" },
        ].map(({ label, valor, color }, i) => (
          <div key={label} className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <p className="text-sm font-semibold" style={{ color: "#9ca3af" }}>{label}</p>
            <p className="text-sm font-black" style={{ color }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Perfil */}
      {!editando ? (
        <div className="rounded-3xl overflow-hidden mb-5" style={{ backgroundColor: "#1c1c1c" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="text-sm font-black text-white">Mi perfil</p>
            <button onClick={() => setEditando(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ backgroundColor: "#222", color: "#22c55e" }}>
              Editar
            </button>
          </div>
          {[
            { label: "Edad", valor: edad ? `${edad} años` : "—" },
            { label: "Sexo", valor: sexo || "—" },
            { label: "Ciudad", valor: ciudad || "—" },
            { label: "Ocupación", valor: ocupacion || "—" },
            { label: "Ingreso mensual", valor: ingresoRango || "—" },
            { label: "Objetivo", valor: objetivo || "—" },
          ].map(({ label, valor }, i) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5"
              style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <p className="text-xs font-semibold" style={{ color: "#6b7280" }}>{label}</p>
              <p className="text-xs font-bold text-white text-right max-w-[55%]">{valor}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl p-5 mb-5 space-y-5" style={{ backgroundColor: "#1c1c1c" }}>
          <p className="text-sm font-black text-white">Editar perfil</p>

          <Campo label="Nombre completo">
            <input
              type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre" className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none text-white placeholder-gray-600"
              style={{ backgroundColor: "#222" }}
            />
          </Campo>

          <Campo label="Edad">
            <input
              type="number" inputMode="numeric" value={edad} onChange={(e) => setEdad(e.target.value)}
              placeholder="Ej. 28" className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none text-white placeholder-gray-600"
              style={{ backgroundColor: "#222" }}
            />
          </Campo>

          <Campo label="Sexo">
            <ChipSelect opciones={["Masculino", "Femenino", "Prefiero no decir"]} valor={sexo} onSelect={setSexo} />
          </Campo>

          <Campo label="Ciudad">
            <input
              type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ej. CDMX, Monterrey..." className="w-full rounded-2xl px-4 py-3.5 text-sm font-medium outline-none text-white placeholder-gray-600"
              style={{ backgroundColor: "#222" }}
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

          <div className="flex gap-2 pt-2">
            <button onClick={() => setEditando(false)} className="flex-1 py-3.5 rounded-2xl text-sm font-bold" style={{ backgroundColor: "#222", color: "#9ca3af" }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando} className="flex-1 py-3.5 rounded-2xl text-sm font-bold disabled:opacity-50" style={{ backgroundColor: "#22c55e", color: "#000" }}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={cerrarSesion}
        className="w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98]"
        style={{ backgroundColor: "#1c1c1c", border: "1px solid rgba(255,255,255,0.06)", color: "#ef4444" }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}
