"use client";

import { useEffect, useState } from "react";
import {
  obtenerMetas, crearMeta, abonarMeta, eliminarMeta, actualizarMeta,
  calcularMeta, type Meta,
} from "@/lib/metas";
import { formatearMonto } from "@/lib/transacciones";

const EMOJIS = ["🎯", "🏠", "🚗", "✈️", "📱", "💻", "🎓", "💍", "🐶", "🌴", "💰", "🏋️", "🎸", "🏖️", "🚀"];

function Skel({ w, h, r = "8px" }: { w: string; h: string; r?: string }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r }} />;
}

function lbl(txt: string) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-3)", marginBottom: 8 }}>
      {txt}
    </p>
  );
}

// ── Modal: Crear Meta ──────────────────────────────────────────────
function ModalCrear({ onGuardado, onCerrar }: { onGuardado: () => void; onCerrar: () => void }) {
  const [emoji, setEmoji] = useState("🎯");
  const [nombre, setNombre] = useState("");
  const [montoObjetivo, setMontoObjetivo] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async () => {
    if (!nombre.trim()) { setError("Ponle un nombre a tu meta"); return; }
    if (!montoObjetivo || Number(montoObjetivo) <= 0) { setError("Ingresa un monto válido"); return; }
    setGuardando(true); setError("");
    try {
      await crearMeta({
        nombre: nombre.trim(),
        emoji,
        monto_objetivo: Number(montoObjetivo),
        monto_actual: 0,
        fecha_limite: fechaLimite || null,
      });
      onGuardado();
    } catch {
      setError("Error al guardar. Intenta de nuevo.");
      setGuardando(false);
    }
  };

  const inputStyle = {
    width: "100%", borderRadius: 12, padding: "12px 14px",
    fontSize: 14, fontWeight: 500, outline: "none",
    backgroundColor: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text-1)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="w-full slide-up" style={{
        backgroundColor: "var(--surface)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: "16px 20px 40px",
        maxHeight: "88vh", overflowY: "auto",
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{ width: 32, height: 2, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Nueva meta</h2>
          <button onClick={onCerrar} style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 13, height: 13 }}>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Emoji */}
        <div style={{ marginBottom: 16 }}>
          {lbl("Ícono")}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setEmoji(e)}
                style={{
                  width: 40, height: 40, borderRadius: 10, fontSize: 20,
                  backgroundColor: emoji === e ? "var(--gold-dim)" : "var(--surface-2)",
                  border: emoji === e ? "1px solid var(--gold-border)" : "1px solid transparent",
                  cursor: "pointer",
                }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Nombre */}
        <div style={{ marginBottom: 16 }}>
          {lbl("¿Para qué estás ahorrando?")}
          <input
            type="text" placeholder="Ej. Vacaciones en Europa, iPhone, Carro..."
            value={nombre} onChange={(e) => setNombre(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Monto */}
        <div style={{ marginBottom: 16 }}>
          {lbl("¿Cuánto necesitas?")}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700, color: "var(--text-3)" }}>$</span>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={montoObjetivo} onChange={(e) => setMontoObjetivo(e.target.value)}
              className="font-number"
              style={{ ...inputStyle, paddingLeft: 34, fontSize: 22, fontWeight: 800 }}
            />
          </div>
        </div>

        {/* Fecha */}
        <div style={{ marginBottom: 20 }}>
          {lbl("¿Para cuándo? (opcional)")}
          <div style={{ position: "relative" }}>
            <input
              type="date"
              value={fechaLimite}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setFechaLimite(e.target.value)}
              style={{
                ...inputStyle,
                colorScheme: "dark",
                color: fechaLimite ? "var(--text-1)" : "var(--text-3)",
                paddingRight: 44,
                cursor: "pointer",
              }}
            />
            {/* Icono calendario decorativo */}
            <svg
              viewBox="0 0 20 20" fill="none" stroke="var(--gold)"
              strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 18, height: 18, position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <rect x="3" y="4" width="14" height="13" rx="2" />
              <path d="M3 8h14M7 2v4M13 2v4" />
            </svg>
          </div>
          {fechaLimite && (
            <button
              onClick={() => setFechaLimite("")}
              style={{ marginTop: 6, fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              × Quitar fecha límite
            </button>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>{error}</p>
          </div>
        )}

        <button onClick={handleGuardar} disabled={guardando}
          className="active:scale-[0.98] transition-transform"
          style={{
            width: "100%", padding: "14px 0", borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            backgroundColor: "var(--gold)", color: "#ffffff",
            border: "none", cursor: "pointer", opacity: guardando ? 0.4 : 1,
          }}>
          {guardando ? "Creando..." : "Crear meta"}
        </button>
      </div>
    </div>
  );
}

// ── Modal: Abonar ──────────────────────────────────────────────────
function ModalAbonar({ meta, onGuardado, onCerrar, onEliminar }: {
  meta: Meta; onGuardado: () => void; onCerrar: () => void; onEliminar: () => void;
}) {
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [editando, setEditando] = useState(false);

  // Estado de edición
  const [editEmoji, setEditEmoji] = useState(meta.emoji);
  const [editNombre, setEditNombre] = useState(meta.nombre);
  const [editObjetivo, setEditObjetivo] = useState(String(meta.monto_objetivo));
  const [editFecha, setEditFecha] = useState(meta.fecha_limite || "");
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  const calc = calcularMeta(meta);

  const handleAbonar = async () => {
    const v = Number(monto);
    if (!v || v <= 0) return;
    setGuardando(true);
    await abonarMeta(meta.id, v);
    onGuardado();
  };

  const handleGuardarEdit = async () => {
    if (!editNombre.trim() || !editObjetivo || Number(editObjetivo) <= 0) return;
    setGuardandoEdit(true);
    await actualizarMeta(meta.id, {
      nombre: editNombre.trim(),
      emoji: editEmoji,
      monto_objetivo: Number(editObjetivo),
      fecha_limite: editFecha || null,
    });
    onGuardado();
  };

  const handleEliminar = async () => {
    setEliminando(true);
    await eliminarMeta(meta.id);
    onEliminar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="w-full slide-up" style={{
        backgroundColor: "var(--surface)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: "16px 20px 40px",
        borderTop: "1px solid var(--border)",
      }}>
        <div style={{ width: 32, height: 2, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />

        {/* Header de la meta */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            {meta.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{meta.nombre}</p>
            <p className="font-number" style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
              {formatearMonto(meta.monto_actual)} / {formatearMonto(meta.monto_objetivo)}
            </p>
          </div>
          <button
            onClick={() => setEditando(!editando)}
            style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: editando ? "var(--gold-dim)" : "var(--surface-2)", border: editando ? "1px solid var(--gold-border)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg viewBox="0 0 20 20" fill={editando ? "var(--gold)" : "var(--text-3)"} style={{ width: 12, height: 12 }}>
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button onClick={onCerrar} style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 13, height: 13 }}>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* ── Modo edición ── */}
        {editando && (
          <div style={{ marginBottom: 20, padding: "16px", borderRadius: 14, backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
            {/* Emoji */}
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>Ícono</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setEditEmoji(e)}
                  style={{ width: 36, height: 36, borderRadius: 9, fontSize: 18, backgroundColor: editEmoji === e ? "var(--gold-dim)" : "var(--surface-3)", border: editEmoji === e ? "1px solid var(--gold-border)" : "1px solid transparent", cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>
            {/* Nombre */}
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>Nombre</p>
            <input
              type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
              style={{ width: "100%", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600, backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-1)", outline: "none", marginBottom: 12 }}
            />
            {/* Objetivo */}
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>Meta ($)</p>
            <input
              type="number" inputMode="decimal" value={editObjetivo} onChange={(e) => setEditObjetivo(e.target.value)}
              className="font-number"
              style={{ width: "100%", borderRadius: 10, padding: "10px 12px", fontSize: 16, fontWeight: 700, backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-1)", outline: "none", marginBottom: 12 }}
            />
            {/* Fecha */}
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>Fecha límite</p>
            <input
              type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)}
              style={{ width: "100%", borderRadius: 10, padding: "10px 12px", fontSize: 13, backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: editFecha ? "var(--text-1)" : "var(--text-3)", outline: "none", colorScheme: "dark", marginBottom: 14 }}
            />
            <button onClick={handleGuardarEdit} disabled={guardandoEdit}
              className="active:scale-[0.98] transition-transform"
              style={{ width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: "var(--gold)", color: "#ffffff", border: "none", cursor: "pointer", opacity: guardandoEdit ? 0.5 : 1 }}>
              {guardandoEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}

        {/* Barra de progreso */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ width: "100%", height: 4, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
            <div style={{ height: 4, borderRadius: 99, width: `${calc.pct}%`, backgroundColor: calc.completada ? "var(--success)" : "var(--gold)", transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>{calc.pct.toFixed(0)}% completado</p>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>Falta {formatearMonto(calc.restante)}</p>
          </div>
        </div>

        {!calc.completada && (
          <>
            {lbl("¿Cuánto abonás hoy?")}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700, color: "var(--text-3)" }}>$</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00" autoFocus
                value={monto} onChange={(e) => setMonto(e.target.value)}
                className="font-number"
                style={{
                  width: "100%", borderRadius: 12, paddingLeft: 34, paddingRight: 14, paddingTop: 14, paddingBottom: 14,
                  fontSize: 26, fontWeight: 800, outline: "none",
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                }}
              />
            </div>

            <button onClick={handleAbonar} disabled={guardando || !monto || Number(monto) <= 0}
              className="active:scale-[0.98] transition-transform"
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12, marginBottom: 10,
                fontSize: 14, fontWeight: 700,
                backgroundColor: "var(--gold)", color: "#ffffff",
                border: "none", cursor: "pointer", opacity: (guardando || !monto || Number(monto) <= 0) ? 0.4 : 1,
              }}>
              {guardando ? "Guardando..." : "Abonar"}
            </button>
          </>
        )}

        {!confirmarEliminar ? (
          <button onClick={() => setConfirmarEliminar(true)}
            style={{ width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, backgroundColor: "transparent", color: "var(--text-3)", border: "none", cursor: "pointer" }}>
            Eliminar meta
          </button>
        ) : (
          <div style={{ padding: 14, borderRadius: 12, backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>¿Eliminar esta meta?</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>Se perderá el progreso registrado.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmarEliminar(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "none", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handleEliminar} disabled={eliminando}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700, backgroundColor: "var(--danger)", color: "#fff", border: "none", cursor: "pointer", opacity: eliminando ? 0.5 : 1 }}>
                {eliminando ? "..." : "Eliminar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────
export default function MetasPage() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalAbonar, setModalAbonar] = useState<Meta | null>(null);

  const cargar = async () => {
    try {
      const data = await obtenerMetas();
      setMetas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const totalAhorrado = metas.reduce((s, m) => s + m.monto_actual, 0);
  const totalObjetivo = metas.reduce((s, m) => s + m.monto_objetivo, 0);

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)", padding: "56px 20px 120px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 4 }}>
            Mis ahorros
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>Metas</h1>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 99,
            fontSize: 12, fontWeight: 700,
            backgroundColor: "var(--gold)", color: "#ffffff",
            border: "none", cursor: "pointer",
          }}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
            <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
          </svg>
          Nueva meta
        </button>
      </div>

      {/* Resumen total */}
      {!cargando && metas.length > 0 && (
        <div style={{ padding: "14px 16px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>Total ahorrado</p>
            <p className="font-number" style={{ fontSize: 12, color: "var(--text-3)" }}>
              {formatearMonto(totalAhorrado)} / {formatearMonto(totalObjetivo)}
            </p>
          </div>
          <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
            <div style={{
              height: 3, borderRadius: 99,
              width: `${totalObjetivo > 0 ? Math.min((totalAhorrado / totalObjetivo) * 100, 100) : 0}%`,
              backgroundColor: "var(--gold)",
              transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
            }} />
          </div>
        </div>
      )}

      {/* Lista de metas */}
      {cargando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 16 }} />)}
        </div>
      ) : metas.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "56px 20px",
          borderRadius: 20, backgroundColor: "var(--surface)", border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Sin metas todavía</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 20 }}>
            Define a dónde quieres llegar con tu dinero y ve tu progreso cada día.
          </p>
          <button onClick={() => setModalCrear(true)}
            style={{
              padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 700,
              backgroundColor: "var(--gold)", color: "#ffffff", border: "none", cursor: "pointer",
            }}>
            Crear mi primera meta
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {metas.map((meta) => {
            const calc = calcularMeta(meta);
            const barColor = calc.completada ? "var(--success)" : calc.urgente ? "var(--danger)" : "var(--gold)";

            return (
              <button
                key={meta.id}
                onClick={() => setModalAbonar(meta)}
                className="active:scale-[0.98] transition-transform"
                style={{
                  width: "100%", textAlign: "left",
                  padding: "16px", borderRadius: 18,
                  backgroundColor: "var(--surface)", border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  {/* Emoji */}
                  <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {meta.emoji}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{meta.nombre}</p>
                    <p className="font-number" style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {formatearMonto(meta.monto_actual)} de {formatearMonto(meta.monto_objetivo)}
                    </p>
                  </div>
                  {/* Porcentaje */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: barColor, lineHeight: 1 }}>
                      {calc.pct.toFixed(0)}%
                    </p>
                    {calc.completada && <p style={{ fontSize: 9, fontWeight: 700, color: "var(--success)", marginTop: 2 }}>✓ Lista</p>}
                    {calc.urgente && <p style={{ fontSize: 9, fontWeight: 700, color: "var(--danger)", marginTop: 2 }}>Pronto</p>}
                  </div>
                </div>

                {/* Barra */}
                <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
                  <div style={{ height: 3, borderRadius: 99, width: `${calc.pct}%`, backgroundColor: barColor, transition: "width 0.7s" }} />
                </div>

                {/* Pie: info de plazo */}
                {(calc.diasRestantes !== null || calc.porMes !== null) && !calc.completada && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                    {calc.diasRestantes !== null && (
                      <p style={{ fontSize: 10, color: calc.urgente ? "var(--danger)" : "var(--text-3)", fontWeight: 500 }}>
                        {calc.diasRestantes > 0 ? `${calc.diasRestantes} días` : "Venció"}
                      </p>
                    )}
                    {calc.porMes !== null && calc.porMes > 0 && (
                      <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>
                        Ahorra {formatearMonto(calc.porMes)}/mes
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {modalCrear && (
        <ModalCrear
          onGuardado={() => { setModalCrear(false); cargar(); }}
          onCerrar={() => setModalCrear(false)}
        />
      )}

      {modalAbonar && (
        <ModalAbonar
          meta={modalAbonar}
          onGuardado={() => { setModalAbonar(null); cargar(); }}
          onCerrar={() => setModalAbonar(null)}
          onEliminar={() => { setModalAbonar(null); cargar(); }}
        />
      )}
    </main>
  );
}
