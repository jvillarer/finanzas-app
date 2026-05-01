"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

// ── Tokens ────────────────────────────────────────────────────────────────────
const BG      = "#F5F3EE";
const SURFACE = "#FFFFFF";
const TEXT1   = "#0E0E10";
const TEXT2   = "rgba(14,14,16,0.56)";
const TEXT3   = "rgba(14,14,16,0.38)";
const BORDER  = "rgba(14,14,16,0.09)";
const ACCENT  = "#1B4332";

const COLORES = [
  { hex: "#1B4332", label: "Verde" },
  { hex: "#1e3a5f", label: "Azul" },
  { hex: "#7c2d12", label: "Rojo" },
  { hex: "#4a1d96", label: "Morado" },
  { hex: "#78350f", label: "Café" },
  { hex: "#0f172a", label: "Negro" },
];

interface Tarjeta {
  id: string;
  nombre: string;
  banco: string | null;
  dia_corte: number;
  dias_para_pago: number;
  color: string;
  activa: boolean;
}

const VACIA: Omit<Tarjeta, "id" | "activa"> = {
  nombre: "",
  banco: "",
  dia_corte: 1,
  dias_para_pago: 20,
  color: "#1B4332",
};

export default function TarjetasPage() {
  const router = useRouter();
  const [tarjetas, setTarjetas]     = useState<Tarjeta[]>([]);
  const [cargando, setCargando]     = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando]     = useState<Tarjeta | null>(null);
  const [form, setForm]             = useState({ ...VACIA });
  const [guardando, setGuardando]   = useState(false);
  const [error, setError]           = useState("");

  const cargar = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("tarjetas")
      .select("*")
      .eq("activa", true)
      .order("created_at", { ascending: true });
    setTarjetas(data ?? []);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, []);

  const abrirNueva = () => {
    setEditando(null);
    setForm({ ...VACIA });
    setError("");
    setMostrarForm(true);
  };

  const abrirEditar = (t: Tarjeta) => {
    setEditando(t);
    setForm({ nombre: t.nombre, banco: t.banco ?? "", dia_corte: t.dia_corte, dias_para_pago: t.dias_para_pago, color: t.color });
    setError("");
    setMostrarForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setGuardando(true);
    setError("");
    const supabase = createClient();
    const payload = {
      nombre:         form.nombre.trim(),
      banco:          form.banco?.trim() || null,
      dia_corte:      form.dia_corte,
      dias_para_pago: form.dias_para_pago,
      color:          form.color,
    };
    if (editando) {
      await supabase.from("tarjetas").update(payload).eq("id", editando.id);
    } else {
      await supabase.from("tarjetas").insert(payload);
    }
    setGuardando(false);
    setMostrarForm(false);
    cargar();
  };

  const eliminar = async (id: string) => {
    const supabase = createClient();
    await supabase.from("tarjetas").update({ activa: false }).eq("id", id);
    cargar();
  };

  // ── Fecha de pago estimada ────────────────────────────────────────────────
  const fechaPagoEjemplo = (dia_corte: number, dias_pago: number) => {
    const hoy   = new Date();
    const dia   = hoy.getDate();
    const corte = dia <= dia_corte
      ? new Date(hoy.getFullYear(), hoy.getMonth(), dia_corte)
      : new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia_corte);
    const pago = new Date(corte);
    pago.setDate(pago.getDate() + dias_pago);
    return pago.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ padding: "56px 20px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth={2} strokeLinecap="round" style={{ width: 22, height: 22 }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT1 }}>Mis tarjetas de crédito</h1>
      </div>

      {/* Lista */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {cargando ? (
          <p style={{ color: TEXT3, textAlign: "center", padding: 32, fontSize: 14 }}>Cargando...</p>
        ) : tarjetas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>💳</p>
            <p style={{ fontSize: 15, color: TEXT2, marginBottom: 4 }}>No tienes tarjetas registradas</p>
            <p style={{ fontSize: 13, color: TEXT3 }}>Agrégalas para ver tu flujo real de pagos</p>
          </div>
        ) : tarjetas.map(t => (
          <div key={t.id} style={{ backgroundColor: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
            {/* Banda de color */}
            <div style={{ height: 6, backgroundColor: t.color }} />
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: TEXT1 }}>{t.nombre}</p>
                  {t.banco && <p style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>{t.banco}</p>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => abrirEditar(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth={1.8} strokeLinecap="round" style={{ width: 16, height: 16 }}>
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => eliminar(t.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D94A4A" strokeWidth={1.8} strokeLinecap="round" style={{ width: 16, height: 16 }}>
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <div>
                  <p style={{ fontSize: 10, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Corte</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT1 }}>Día {t.dia_corte}</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pago</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT1 }}>{t.dias_para_pago} días después</p>
                </div>
                <div>
                  <p style={{ fontSize: 10, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Próximo pago</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>{fechaPagoEjemplo(t.dia_corte, t.dias_para_pago)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Botón agregar */}
        <button
          onClick={abrirNueva}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 14,
            border: `1.5px dashed ${BORDER}`, backgroundColor: SURFACE,
            fontSize: 14, fontWeight: 600, color: ACCENT,
            cursor: "pointer", marginTop: 4,
          }}
        >
          + Agregar tarjeta
        </button>
      </div>

      {/* ── Modal / Sheet ──────────────────────────────────────────────────── */}
      {mostrarForm && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", backgroundColor: SURFACE, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", maxHeight: "90vh", overflowY: "auto" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: TEXT1 }}>
                {editando ? "Editar tarjeta" : "Nueva tarjeta"}
              </h2>
              <button onClick={() => setMostrarForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={TEXT2} strokeWidth={2} strokeLinecap="round" style={{ width: 22, height: 22 }}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Nombre */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Nombre *</label>
              <input
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: AMEX Gold, BBVA Azul"
                style={{ width: "100%", marginTop: 6, padding: "12px 14px", borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 15, color: TEXT1, backgroundColor: BG, outline: "none" }}
              />
            </div>

            {/* Banco */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Banco (opcional)</label>
              <input
                value={form.banco ?? ""}
                onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                placeholder="Ej: BBVA, Santander, AMEX"
                style={{ width: "100%", marginTop: 6, padding: "12px 14px", borderRadius: 12, border: `1px solid ${BORDER}`, fontSize: 15, color: TEXT1, backgroundColor: BG, outline: "none" }}
              />
            </div>

            {/* Día de corte */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Día de corte: <span style={{ color: TEXT1 }}>{form.dia_corte}</span>
              </label>
              <input
                type="range" min={1} max={31} value={form.dia_corte}
                onChange={e => setForm(f => ({ ...f, dia_corte: parseInt(e.target.value) }))}
                style={{ width: "100%", marginTop: 8 }}
              />
            </div>

            {/* Días para pago */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Días para pagar después del corte: <span style={{ color: TEXT1 }}>{form.dias_para_pago}</span>
              </label>
              <input
                type="range" min={1} max={40} value={form.dias_para_pago}
                onChange={e => setForm(f => ({ ...f, dias_para_pago: parseInt(e.target.value) }))}
                style={{ width: "100%", marginTop: 8 }}
              />
              <p style={{ fontSize: 12, color: ACCENT, marginTop: 4 }}>
                Próximo pago estimado: {fechaPagoEjemplo(form.dia_corte, form.dias_para_pago)}
              </p>
            </div>

            {/* Color */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Color</label>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                {COLORES.map(c => (
                  <button key={c.hex} onClick={() => setForm(f => ({ ...f, color: c.hex }))}
                    style={{
                      width: 36, height: 36, borderRadius: "50%", backgroundColor: c.hex, border: "none", cursor: "pointer",
                      outline: form.color === c.hex ? `3px solid ${c.hex}` : "none",
                      outlineOffset: 2,
                      transform: form.color === c.hex ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>

            {error && <p style={{ fontSize: 13, color: "#D94A4A", marginBottom: 12 }}>{error}</p>}

            <button
              onClick={guardar}
              disabled={guardando}
              style={{
                width: "100%", padding: "15px 0", borderRadius: 14,
                backgroundColor: ACCENT, color: "#fff",
                fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer",
                opacity: guardando ? 0.6 : 1,
              }}
            >
              {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Agregar tarjeta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
