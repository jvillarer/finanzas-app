"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { obtenerTransacciones, calcularResumen, formatearMonto } from "@/lib/transacciones";
import { suscribirAPush, cancelarPush, tienePushActivo } from "@/lib/notificaciones";

const OCUPACIONES = ["Empleado", "Independiente / Freelance", "Empresario", "Estudiante", "Ama/o de casa", "Otro"];
const INGRESOS = ["Menos de $10k", "$10k–$20k", "$20k–$40k", "$40k–$80k", "Más de $80k"];
const OBJETIVOS = ["Ahorrar más", "Salir de deudas", "Controlar mis gastos", "Planear un proyecto", "Invertir", "Solo quiero ver mis finanzas"];
const SEXOS = ["Hombre", "Mujer"];
const ESTADOS_MX = [
  "Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua",
  "Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero",
  "Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla",
  "Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas",
  "Tlaxcala","Veracruz","Yucatán","Zacatecas",
];

function ChipSelect({ opciones, valor, onSelect }: { opciones: string[]; valor: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((op) => (
        <button key={op} type="button" onClick={() => onSelect(op)}
          className="px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
          style={{
            backgroundColor: valor === op ? "var(--gold-dim)" : "var(--surface-2)",
            border: valor === op ? "1px solid var(--gold-border)" : "1px solid transparent",
            color: valor === op ? "var(--gold)" : "var(--text-2)",
          }}>
          {op}
        </button>
      ))}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 mb-2 tracking-widest uppercase"
        style={{ color: "var(--text-3)" }}>{label}</label>
      {children}
    </div>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between py-3.5"
      style={{ borderBottom: "1px solid var(--border-2)" }}>
      <p className="text-xs font-medium" style={{ color: "var(--text-3)" }}>{label}</p>
      <p className="text-xs font-semibold text-right max-w-[55%]" style={{ color: "var(--text-2)" }}>{valor}</p>
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
  const [borrandoDatos, setBorrandoDatos] = useState(false);
  const [confirmarBorrarDatos, setConfirmarBorrarDatos] = useState(false);
  const [datosBorrados, setDatosBorrados] = useState(false);
  const [pushActivo, setPushActivo] = useState(false);
  const [activandoPush, setActivandoPush] = useState(false);
  const [soportaPush, setSoportaPush] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [estado, setEstado] = useState("");
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
        setEstado(m.estado || "");
        setOcupacion(m.ocupacion || "");
        setIngresoRango(m.ingreso_mensual || "");
        setObjetivo(m.objetivo_financiero || "");
        const n = m.nombre_completo || "";
        setIniciales(n ? n.split(" ").slice(0, 2).map((p: string) => p[0]).join("").toUpperCase() : "?");
      }
      const txs = await obtenerTransacciones();
      setResumen(calcularResumen(txs));
      // Verificar soporte y estado de push
      const soporte = "serviceWorker" in navigator && "PushManager" in window;
      setSoportaPush(soporte);
      if (soporte) setPushActivo(await tienePushActivo());
    })();
  }, []);

  const guardar = async () => {
    setGuardando(true);
    const supabase = createClient();
    // Obtener el usuario primero (necesario para el upsert del perfil)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGuardando(false); return; }

    const edadNum = Number(edad) || 0;
    const metadata = {
      nombre_completo: nombre, edad: edadNum, sexo, ciudad, estado,
      ocupacion, ingreso_mensual: ingresoRango, objetivo_financiero: objetivo,
    };

    // Actualizar auth metadata y tabla perfiles en paralelo
    await Promise.all([
      supabase.auth.updateUser({ data: metadata }),
      supabase.from("perfiles").upsert({
        id: user.id, nombre_completo: nombre, edad: edadNum, sexo, ciudad, estado,
        ocupacion, ingreso_mensual_rango: ingresoRango, objetivo_financiero: objetivo,
      }),
    ]);

    setIniciales(nombre ? nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase() : "?");
    setGuardando(false);
    setEditando(false);
  };

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const borrarDatos = async () => {
    setBorrandoDatos(true);
    try {
      const res = await fetch("/api/borrar-datos", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ocurrió un error.");
        setBorrandoDatos(false);
        setConfirmarBorrarDatos(false);
        return;
      }
      // Limpiar caché local también
      localStorage.removeItem("lani_chat_mensajes");
      localStorage.removeItem("lani_memoria");
      // Borrar todas las claves de insight por fecha
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("lani_insight_")) localStorage.removeItem(k);
      });
      setResumen({ ingresos: 0, gastos: 0, balance: 0 });
      setConfirmarBorrarDatos(false);
      setDatosBorrados(true);
      setTimeout(() => setDatosBorrados(false), 4000);
    } catch {
      alert("Error de conexión. Intenta de nuevo.");
    } finally {
      setBorrandoDatos(false);
    }
  };

  const eliminarCuenta = async () => {
    setEliminandoCuenta(true);
    try {
      const res = await fetch("/api/eliminar-cuenta", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ocurrió un error.");
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

  const togglePush = async () => {
    setActivandoPush(true);
    try {
      if (pushActivo) {
        await cancelarPush();
        setPushActivo(false);
      } else {
        const ok = await suscribirAPush();
        setPushActivo(ok);
      }
    } finally {
      setActivandoPush(false);
    }
  };

  const inputStyle = {
    backgroundColor: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text-1)",
  };

  return (
    <main className="min-h-screen px-5 pt-14 pb-28" style={{ backgroundColor: "var(--bg)" }}>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold mb-3"
          style={{
            backgroundColor: "var(--gold-dim)",
            border: "1px solid var(--gold-border)",
            color: "var(--gold)",
            letterSpacing: "1px",
          }}
        >
          {iniciales}
        </div>
        <h1 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>{nombre || "Mi cuenta"}</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{correo}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: "Balance", valor: formatearMonto(resumen.balance), color: resumen.balance >= 0 ? "var(--success)" : "var(--danger)" },
          { label: "Ingresos", valor: formatearMonto(resumen.ingresos), color: "var(--success)" },
          { label: "Gastos", valor: formatearMonto(resumen.gastos), color: "var(--danger)" },
        ].map(({ label, valor, color }) => (
          <div key={label} className="rounded-xl p-3 text-center"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>{label}</p>
            <p className="text-xs font-bold font-number" style={{ color }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Notificaciones push */}
      {soportaPush && (
        <div className="rounded-2xl px-5 py-4 mb-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Notificaciones de Lani</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              {pushActivo ? "Activas — recibirás recordatorios quincenales" : "Recibe recordatorios y alertas de presupuesto"}
            </p>
          </div>
          <button
            onClick={togglePush}
            disabled={activandoPush}
            className="relative shrink-0 transition-all active:scale-95 disabled:opacity-40"
            style={{ width: 48, height: 28 }}
            aria-label={pushActivo ? "Desactivar notificaciones" : "Activar notificaciones"}
          >
            <div className="absolute inset-0 rounded-full transition-colors duration-200"
              style={{ backgroundColor: pushActivo ? "var(--gold)" : "var(--surface-2)", border: "1px solid var(--border)" }} />
            <div className="absolute top-0.5 rounded-full transition-all duration-200 bg-white"
              style={{ width: 24, height: 24, left: pushActivo ? 22 : 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </button>
        </div>
      )}

      {/* Perfil */}
      {!editando ? (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Mi perfil</p>
            <button onClick={() => setEditando(true)}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              Editar
            </button>
          </div>
          <div className="px-5">
            <Fila label="Edad" valor={edad ? `${edad} años` : "—"} />
            <Fila label="Sexo" valor={sexo || "—"} />
            <Fila label="Ciudad" valor={ciudad || "—"} />
            <Fila label="Estado" valor={estado || "—"} />
            <Fila label="Ocupación" valor={ocupacion || "—"} />
            <Fila label="Ingreso mensual" valor={ingresoRango || "—"} />
            <Fila label="Objetivo" valor={objetivo || "—"} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-5 mb-4 space-y-5"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Editar perfil</p>

          <Campo label="Nombre completo">
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={inputStyle} />
          </Campo>

          <Campo label="Edad">
            <input type="number" inputMode="numeric" value={edad} onChange={(e) => setEdad(e.target.value)}
              placeholder="Ej. 28"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={inputStyle} />
          </Campo>

          <Campo label="Sexo"><ChipSelect opciones={SEXOS} valor={sexo} onSelect={setSexo} /></Campo>

          <Campo label="Ciudad">
            <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ej. Monterrey, Guadalajara..."
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={inputStyle} />
          </Campo>

          <Campo label="Estado">
            <select
              value={estado} onChange={(e) => setEstado(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none" }}
            >
              <option value="">Selecciona tu estado</option>
              {ESTADOS_MX.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </Campo>

          <Campo label="Ocupación"><ChipSelect opciones={OCUPACIONES} valor={ocupacion} onSelect={setOcupacion} /></Campo>
          <Campo label="Ingreso mensual"><ChipSelect opciones={INGRESOS} valor={ingresoRango} onSelect={setIngresoRango} /></Campo>
          <Campo label="Objetivo financiero"><ChipSelect opciones={OBJETIVOS} valor={objetivo} onSelect={setObjetivo} /></Campo>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditando(false)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: "var(--gold)", color: "#0c0c0e" }}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Cerrar sesión */}
      <button onClick={cerrarSesion}
        className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mb-2"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--danger)" }}>
        Cerrar sesión
      </button>

      {/* Borrar mis datos */}
      {datosBorrados ? (
        <div className="w-full py-3.5 rounded-xl text-sm font-semibold text-center mb-2"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--success)" }}>
          ✓ Todos tus datos fueron borrados
        </div>
      ) : !confirmarBorrarDatos ? (
        <button onClick={() => setConfirmarBorrarDatos(true)}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] mb-2"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
          Borrar mis datos
        </button>
      ) : (
        <div className="rounded-xl p-4 mb-2"
          style={{ backgroundColor: "rgba(180,130,0,0.08)", border: "1px solid rgba(180,130,0,0.2)" }}>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>¿Borrar todos tus datos?</p>
          <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text-3)" }}>
            Se eliminarán todas tus transacciones, metas y presupuestos. Tu cuenta se mantiene activa y puedes volver a empezar.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmarBorrarDatos(false)} disabled={borrandoDatos}
              className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              Cancelar
            </button>
            <button onClick={borrarDatos} disabled={borrandoDatos}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: "var(--gold)", color: "#0c0c0e" }}>
              {borrandoDatos ? "Borrando..." : "Sí, borrar"}
            </button>
          </div>
        </div>
      )}

      {/* Eliminar cuenta */}
      {!confirmarEliminar ? (
        <button onClick={() => setConfirmarEliminar(true)}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{ color: "var(--text-3)" }}>
          Eliminar cuenta
        </button>
      ) : (
        <div className="rounded-xl p-4 mt-2"
          style={{ backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>¿Eliminar tu cuenta?</p>
          <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text-3)" }}>
            Esta acción es permanente. Se borrarán todas tus transacciones y datos. No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmarEliminar(false)} disabled={eliminandoCuenta}
              className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>
              Cancelar
            </button>
            <button onClick={eliminarCuenta} disabled={eliminandoCuenta}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ backgroundColor: "var(--danger)", color: "#fff" }}>
              {eliminandoCuenta ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
