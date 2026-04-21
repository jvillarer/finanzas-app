"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { obtenerTransacciones, formatearMonto } from "@/lib/transacciones";
import { verificarPresupuestos } from "@/lib/notificaciones";
import {
  obtenerMetas, crearMeta, abonarMeta, eliminarMeta, actualizarMeta,
  calcularMeta, type Meta,
} from "@/lib/metas";

type Tab = "metas" | "presupuestos" | "proyectos";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers compartidos
// ─────────────────────────────────────────────────────────────────────────────
const EMOJIS_META = ["🎯", "🏠", "🚗", "✈️", "📱", "💻", "🎓", "💍", "🐶", "🌴", "💰", "🏋️", "🎸", "🏖️", "🚀"];

const CATEGORIAS = [
  { nombre: "Comida",          emoji: "🍽" },
  { nombre: "Supermercado",    emoji: "🛒" },
  { nombre: "Transporte",      emoji: "🚗" },
  { nombre: "Entretenimiento", emoji: "🎬" },
  { nombre: "Salud",           emoji: "💊" },
  { nombre: "Servicios",       emoji: "⚡" },
  { nombre: "Ropa",            emoji: "👕" },
  { nombre: "Hogar",           emoji: "🏠" },
  { nombre: "Educación",       emoji: "📚" },
  { nombre: "Otros",           emoji: "📦" },
];

const SIMBOLOS: Record<string, string> = { MXN: "$", USD: "US$", EUR: "€" };

function lbl(txt: string) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>
      {txt}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN: METAS
// ─────────────────────────────────────────────────────────────────────────────
// Bloquea el scroll del body mientras un modal está abierto (fix iOS)
function useLockBodyScroll() {
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);
}

function ModalCrearMeta({ onGuardado, onCerrar }: { onGuardado: () => void; onCerrar: () => void }) {
  useLockBodyScroll();
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
      await crearMeta({ nombre: nombre.trim(), emoji, monto_objetivo: Number(montoObjetivo), monto_actual: 0, fecha_limite: fechaLimite || null });
      onGuardado();
    } catch { setError("Error al guardar."); setGuardando(false); }
  };

  const inputStyle = { width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 500, outline: "none", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="w-full slide-up" style={{ backgroundColor: "var(--surface)", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "16px 20px 40px", maxHeight: "88vh", overflowY: "auto", borderTop: "1px solid var(--border)" }}>
        <div style={{ width: 32, height: 2, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Nueva meta</h2>
          <button onClick={onCerrar} style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 13, height: 13 }}><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          {lbl("Ícono")}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {EMOJIS_META.map((e) => (
              <button key={e} onClick={() => setEmoji(e)} style={{ width: 40, height: 40, borderRadius: 10, fontSize: 20, backgroundColor: emoji === e ? "var(--gold-dim)" : "var(--surface-2)", border: emoji === e ? "1px solid var(--gold-border)" : "1px solid transparent", cursor: "pointer" }}>{e}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          {lbl("¿Para qué estás ahorrando?")}
          <input type="text" placeholder="Ej. Vacaciones, iPhone, Carro..." value={nombre} onChange={(e) => setNombre(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          {lbl("¿Cuánto necesitas?")}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700, color: "var(--text-3)" }}>$</span>
            <input type="number" inputMode="decimal" placeholder="0.00" value={montoObjetivo} onChange={(e) => setMontoObjetivo(e.target.value)} className="font-number" style={{ ...inputStyle, paddingLeft: 34, fontSize: 22, fontWeight: 800 }} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          {lbl("¿Para cuándo? (opcional)")}
          <input type="date" value={fechaLimite} min={new Date().toISOString().split("T")[0]} onChange={(e) => setFechaLimite(e.target.value)} style={{ ...inputStyle, colorScheme: "light" as const }} />
          {fechaLimite && <button onClick={() => setFechaLimite("")} style={{ marginTop: 6, fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>× Quitar fecha límite</button>}
        </div>

        {error && <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, backgroundColor: "rgba(217,74,74,0.08)", border: "1px solid rgba(217,74,74,0.2)" }}><p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>{error}</p></div>}

        <button onClick={handleGuardar} disabled={guardando} className="active:scale-[0.98] transition-transform" style={{ width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, backgroundColor: "var(--gold)", color: "#ffffff", border: "none", cursor: "pointer", opacity: guardando ? 0.4 : 1 }}>
          {guardando ? "Creando..." : "Crear meta"}
        </button>
      </div>
    </div>
  );
}

function ModalAbonarMeta({ meta, onGuardado, onCerrar, onEliminar }: { meta: Meta; onGuardado: () => void; onCerrar: () => void; onEliminar: () => void }) {
  useLockBodyScroll();
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [editando, setEditando] = useState(false);
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
    await actualizarMeta(meta.id, { nombre: editNombre.trim(), emoji: editEmoji, monto_objetivo: Number(editObjetivo), fecha_limite: editFecha || null });
    onGuardado();
  };

  const handleEliminar = async () => { setEliminando(true); await eliminarMeta(meta.id); onEliminar(); };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="w-full slide-up" style={{ backgroundColor: "var(--surface)", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "16px 20px 40px", borderTop: "1px solid var(--border)" }}>
        <div style={{ width: 32, height: 2, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{meta.emoji}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>{meta.nombre}</p>
            <p className="font-number" style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{formatearMonto(meta.monto_actual)} / {formatearMonto(meta.monto_objetivo)}</p>
          </div>
          <button onClick={() => setEditando(!editando)} style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: editando ? "var(--gold-dim)" : "var(--surface-2)", border: editando ? "1px solid var(--gold-border)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 20 20" fill={editando ? "var(--gold)" : "var(--text-3)"} style={{ width: 12, height: 12 }}><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
          </button>
          <button onClick={onCerrar} style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 13, height: 13 }}><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
          </button>
        </div>

        {editando && (
          <div style={{ marginBottom: 20, padding: 16, borderRadius: 14, backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>Ícono</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {EMOJIS_META.map((e) => (
                <button key={e} onClick={() => setEditEmoji(e)} style={{ width: 36, height: 36, borderRadius: 9, fontSize: 18, backgroundColor: editEmoji === e ? "var(--gold-dim)" : "var(--surface-3)", border: editEmoji === e ? "1px solid var(--gold-border)" : "1px solid transparent", cursor: "pointer" }}>{e}</button>
              ))}
            </div>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>Nombre</p>
            <input type="text" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} style={{ width: "100%", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600, backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-1)", outline: "none", marginBottom: 12 }} />
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 6 }}>Meta ($)</p>
            <input type="number" inputMode="decimal" value={editObjetivo} onChange={(e) => setEditObjetivo(e.target.value)} className="font-number" style={{ width: "100%", borderRadius: 10, padding: "10px 12px", fontSize: 16, fontWeight: 700, backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-1)", outline: "none", marginBottom: 14 }} />
            <button onClick={handleGuardarEdit} disabled={guardandoEdit} className="active:scale-[0.98] transition-transform" style={{ width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: "var(--gold)", color: "#ffffff", border: "none", cursor: "pointer", opacity: guardandoEdit ? 0.5 : 1 }}>
              {guardandoEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}

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
              <input type="number" inputMode="decimal" placeholder="0.00" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} className="font-number" style={{ width: "100%", borderRadius: 12, paddingLeft: 34, paddingRight: 14, paddingTop: 14, paddingBottom: 14, fontSize: 26, fontWeight: 800, outline: "none", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} />
            </div>
            <button onClick={handleAbonar} disabled={guardando || !monto || Number(monto) <= 0} className="active:scale-[0.98] transition-transform" style={{ width: "100%", padding: "14px 0", borderRadius: 12, marginBottom: 10, fontSize: 14, fontWeight: 700, backgroundColor: "var(--gold)", color: "#ffffff", border: "none", cursor: "pointer", opacity: (guardando || !monto || Number(monto) <= 0) ? 0.4 : 1 }}>
              {guardando ? "Guardando..." : "Abonar"}
            </button>
          </>
        )}

        {!confirmarEliminar ? (
          <button onClick={() => setConfirmarEliminar(true)} style={{ width: "100%", padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, backgroundColor: "transparent", color: "var(--text-3)", border: "none", cursor: "pointer" }}>Eliminar meta</button>
        ) : (
          <div style={{ padding: 14, borderRadius: 12, backgroundColor: "rgba(217,74,74,0.08)", border: "1px solid rgba(217,74,74,0.2)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>¿Eliminar esta meta?</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>Se perderá el progreso registrado.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmarEliminar(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "none", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleEliminar} disabled={eliminando} style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700, backgroundColor: "var(--danger)", color: "#fff", border: "none", cursor: "pointer", opacity: eliminando ? 0.5 : 1 }}>{eliminando ? "..." : "Eliminar"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SeccionMetas() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalAbonar, setModalAbonar] = useState<Meta | null>(null);

  const cargar = async () => {
    try { const data = await obtenerMetas(); setMetas(data); }
    catch (e) { console.error(e); }
    finally { setCargando(false); }
  };
  useEffect(() => { cargar(); }, []);

  const totalAhorrado = metas.reduce((s, m) => s + m.monto_actual, 0);
  const totalObjetivo = metas.reduce((s, m) => s + m.monto_objetivo, 0);

  return (
    <div style={{ padding: "16px 20px 120px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>Tus metas de ahorro</p>
        <button onClick={() => setModalCrear(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, backgroundColor: "var(--gold)", color: "#ffffff", border: "none", cursor: "pointer" }}>
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 11, height: 11 }}><path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" /></svg>
          Nueva
        </button>
      </div>

      {!cargando && metas.length > 0 && (
        <div style={{ padding: "14px 16px", borderRadius: 16, backgroundColor: "var(--surface)", border: "1px solid var(--border)", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>Total ahorrado</p>
            <p className="font-number" style={{ fontSize: 12, color: "var(--text-3)" }}>{formatearMonto(totalAhorrado)} / {formatearMonto(totalObjetivo)}</p>
          </div>
          <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
            <div style={{ height: 3, borderRadius: 99, width: `${totalObjetivo > 0 ? Math.min((totalAhorrado / totalObjetivo) * 100, 100) : 0}%`, backgroundColor: "var(--gold)", transition: "width 0.7s" }} />
          </div>
        </div>
      )}

      {cargando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 16 }} />)}
        </div>
      ) : metas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", borderRadius: 20, backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Sin metas todavía</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 20 }}>Define a dónde quieres llegar con tu dinero.</p>
          <button onClick={() => setModalCrear(true)} style={{ padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 700, backgroundColor: "var(--gold)", color: "#ffffff", border: "none", cursor: "pointer" }}>Crear mi primera meta</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {metas.map((meta) => {
            const calc = calcularMeta(meta);
            const barColor = calc.completada ? "var(--success)" : calc.urgente ? "var(--danger)" : "var(--gold)";
            return (
              <button key={meta.id} onClick={() => setModalAbonar(meta)} className="active:scale-[0.98] transition-transform" style={{ width: "100%", textAlign: "left", padding: 16, borderRadius: 18, backgroundColor: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{meta.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{meta.nombre}</p>
                    <p className="font-number" style={{ fontSize: 11, color: "var(--text-3)" }}>{formatearMonto(meta.monto_actual)} de {formatearMonto(meta.monto_objetivo)}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: barColor, lineHeight: 1 }}>{calc.pct.toFixed(0)}%</p>
                    {calc.completada && <p style={{ fontSize: 9, fontWeight: 700, color: "var(--success)", marginTop: 2 }}>✓ Lista</p>}
                    {calc.urgente && <p style={{ fontSize: 9, fontWeight: 700, color: "var(--danger)", marginTop: 2 }}>Pronto</p>}
                  </div>
                </div>
                <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
                  <div style={{ height: 3, borderRadius: 99, width: `${calc.pct}%`, backgroundColor: barColor, transition: "width 0.7s" }} />
                </div>
                {(calc.diasRestantes !== null || calc.porMes !== null) && !calc.completada && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    {calc.diasRestantes !== null && <p style={{ fontSize: 10, color: calc.urgente ? "var(--danger)" : "var(--text-3)", fontWeight: 500 }}>{calc.diasRestantes > 0 ? `${calc.diasRestantes} días` : "Venció"}</p>}
                    {calc.porMes !== null && calc.porMes > 0 && <p style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>Ahorra {formatearMonto(calc.porMes)}/mes</p>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {modalCrear && <ModalCrearMeta onGuardado={() => { setModalCrear(false); cargar(); }} onCerrar={() => setModalCrear(false)} />}
      {modalAbonar && <ModalAbonarMeta meta={modalAbonar} onGuardado={() => { setModalAbonar(null); cargar(); }} onCerrar={() => setModalAbonar(null)} onEliminar={() => { setModalAbonar(null); cargar(); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN: PRESUPUESTOS
// ─────────────────────────────────────────────────────────────────────────────
interface Presupuesto { id?: string; categoria: string; limite: number; }
interface PresupuestoConGasto extends Presupuesto { gastado: number; pct: number; emoji: string; }

function ModalPresupuesto({ categoria, emoji, limiteActual, onGuardar, onEliminar, onCerrar }: {
  categoria: string; emoji: string; limiteActual?: number;
  onGuardar: (limite: number) => void; onEliminar?: () => void; onCerrar: () => void;
}) {
  const [valor, setValor] = useState(limiteActual ? String(limiteActual) : "");
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="w-full px-5 pt-4 pb-10 slide-up" style={{ backgroundColor: "var(--surface)", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTop: "1px solid var(--border)" }}>
        <div className="w-8 h-0.5 rounded-full mx-auto mb-5" style={{ backgroundColor: "var(--surface-3)" }} />
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: "var(--surface-2)" }}>{emoji}</div>
          <div>
            <p className="text-base font-bold" style={{ color: "var(--text-1)" }}>{categoria}</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Límite mensual</p>
          </div>
        </div>
        <label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-3)" }}>Monto límite</label>
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: "var(--text-3)" }}>$</span>
          <input type="number" inputMode="decimal" placeholder="0.00" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus className="w-full rounded-xl pl-8 pr-4 py-3.5 text-2xl font-black outline-none font-number" style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} />
        </div>
        <button onClick={() => { if (Number(valor) > 0) onGuardar(Number(valor)); }} className="w-full font-bold py-3.5 rounded-xl text-sm mb-3" style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}>Guardar presupuesto</button>
        {onEliminar && <button onClick={onEliminar} className="w-full font-semibold py-3.5 rounded-xl text-sm" style={{ backgroundColor: "rgba(217,74,74,0.08)", color: "var(--danger)", border: "1px solid rgba(217,74,74,0.15)" }}>Quitar presupuesto</button>}
      </div>
    </div>
  );
}

function SeccionPresupuestos() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [gastosPorCat, setGastosPorCat] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<{ categoria: string; emoji: string; limiteActual?: number; id?: string } | null>(null);

  const cargar = async () => {
    setCargando(true);
    const supabase = createClient();
    const [{ data: presData }, txs] = await Promise.all([supabase.from("presupuestos").select("*"), obtenerTransacciones()]);
    setPresupuestos(presData || []);
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const gastados: Record<string, number> = {};
    txs.filter((t) => t.tipo === "gasto" && new Date(t.fecha + "T12:00:00") >= inicioMes)
       .forEach((t) => { const cat = t.categoria || "Otros"; gastados[cat] = (gastados[cat] || 0) + t.monto; });
    setGastosPorCat(gastados);
    if (presData && presData.length > 0) verificarPresupuestos(presData, gastados);
    setCargando(false);
  };
  useEffect(() => { cargar(); }, []);

  const guardarPresupuesto = async (categoria: string, limite: number) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const existe = presupuestos.find((p) => p.categoria === categoria);
    if (existe?.id) { await supabase.from("presupuestos").update({ limite }).eq("id", existe.id); }
    else { await supabase.from("presupuestos").insert([{ categoria, limite, usuario_id: user?.id }]); }
    setModal(null); cargar();
  };

  const eliminarPresupuesto = async (id: string) => {
    const supabase = createClient();
    await supabase.from("presupuestos").delete().eq("id", id);
    setModal(null); cargar();
  };

  const conDatos: PresupuestoConGasto[] = CATEGORIAS.map((cat) => {
    const p = presupuestos.find((x) => x.categoria === cat.nombre);
    const gastado = gastosPorCat[cat.nombre] || 0;
    const limite = p?.limite || 0;
    const pct = limite > 0 ? Math.min((gastado / limite) * 100, 100) : 0;
    return { id: p?.id, categoria: cat.nombre, emoji: cat.emoji, limite, gastado, pct };
  });

  const conPresupuesto = conDatos.filter((c) => c.limite > 0);
  const sinPresupuesto = conDatos.filter((c) => c.limite === 0);
  const totalGastado = conPresupuesto.reduce((s, c) => s + c.gastado, 0);
  const totalLimite = conPresupuesto.reduce((s, c) => s + c.limite, 0);
  const mesLabel = (() => { const m = new Date().toLocaleString("es-MX", { month: "long" }); return m.charAt(0).toUpperCase() + m.slice(1); })();

  return (
    <div style={{ padding: "16px 20px 120px" }}>
      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>Límites por categoría · {mesLabel}</p>

      {!cargando && conPresupuesto.length > 0 && (
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>Total comprometido</p>
            <p className="text-xs font-number" style={{ color: "var(--text-3)" }}>{formatearMonto(totalGastado)} / {formatearMonto(totalLimite)}</p>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--surface-3)" }}>
            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${totalLimite > 0 ? Math.min((totalGastado / totalLimite) * 100, 100) : 0}%`, backgroundColor: "var(--gold)" }} />
          </div>
        </div>
      )}

      {cargando ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton rounded-2xl" style={{ height: 76 }} />)}</div>
      ) : (
        <>
          {conPresupuesto.length > 0 && (
            <div className="space-y-2 mb-6">
              {conPresupuesto.map((cat) => {
                const pasado = cat.gastado > cat.limite;
                const cerca = cat.pct >= 80 && !pasado;
                const barColor = pasado ? "var(--danger)" : cerca ? "var(--warning)" : "var(--gold)";
                return (
                  <button key={cat.categoria} onClick={() => setModal({ categoria: cat.categoria, emoji: cat.emoji, limiteActual: cat.limite, id: cat.id })} className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.98]" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: "var(--surface-2)" }}>{cat.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{cat.categoria}</p>
                        <p className="text-xs font-number mt-0.5" style={{ color: "var(--text-3)" }}>{formatearMonto(cat.gastado)} de {formatearMonto(cat.limite)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-number" style={{ color: barColor }}>{cat.pct.toFixed(0)}%</p>
                        {pasado && <p className="text-[9px] font-bold mt-0.5" style={{ color: "var(--danger)" }}>Excedido</p>}
                        {cerca && <p className="text-[9px] font-bold mt-0.5" style={{ color: "var(--warning)" }}>Casi</p>}
                      </div>
                    </div>
                    <div className="w-full rounded-full h-1" style={{ backgroundColor: "var(--surface-3)" }}>
                      <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${cat.pct}%`, backgroundColor: barColor }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
            {conPresupuesto.length > 0 ? "Agregar categoría" : "Elige una categoría para empezar"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sinPresupuesto.map((cat) => (
              <button key={cat.categoria} onClick={() => setModal({ categoria: cat.categoria, emoji: cat.emoji })} className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.97]" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                <span className="text-xl">{cat.emoji}</span>
                <div><p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{cat.categoria}</p><p className="text-[10px]" style={{ color: "var(--text-3)" }}>Sin límite</p></div>
              </button>
            ))}
          </div>
        </>
      )}

      {modal && <ModalPresupuesto categoria={modal.categoria} emoji={modal.emoji} limiteActual={modal.limiteActual} onGuardar={(limite) => guardarPresupuesto(modal.categoria, limite)} onEliminar={modal.id ? () => eliminarPresupuesto(modal.id!) : undefined} onCerrar={() => setModal(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN: PROYECTOS
// ─────────────────────────────────────────────────────────────────────────────
interface Proyecto { id: string; nombre: string; moneda: string; presupuesto: number | null; tipo_cambio: number; fecha_inicio: string | null; fecha_fin: string | null; activo: boolean; }
interface TxProyecto { id: string; monto: number; monto_original: number | null; moneda: string | null; descripcion: string; categoria: string; tipo: string; fecha: string; }

function SeccionProyectos() {
  const [proyectoActivo, setProyectoActivo] = useState<Proyecto | null>(null);
  const [transacciones, setTransacciones] = useState<TxProyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [moneda, setMoneda] = useState("MXN");
  const [presupuesto, setPresupuesto] = useState("");
  const [tipoCambio, setTipoCambio] = useState("17.5");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split("T")[0]);
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const supabase = createClient();
    const { data: proyecto } = await supabase.from("viajes").select("*").eq("activo", true).single();
    setProyectoActivo(proyecto || null);
    if (proyecto) {
      const { data: txs } = await supabase.from("transacciones").select("id, monto, monto_original, moneda, descripcion, categoria, tipo, fecha").eq("viaje_id", proyecto.id).order("fecha", { ascending: false });
      setTransacciones(txs || []);
    }
    setCargando(false);
  };

  const crearProyecto = async () => {
    if (!nombre.trim()) return;
    setGuardando(true);
    const supabase = createClient();
    const { error } = await supabase.from("viajes").insert({ nombre: nombre.trim(), moneda, presupuesto: presupuesto ? Number(presupuesto) : null, tipo_cambio: Number(tipoCambio) || 17.5, fecha_inicio: fechaInicio || null, fecha_fin: fechaFin || null, activo: true });
    if (!error) { setCreando(false); await cargarDatos(); }
    setGuardando(false);
  };

  const terminarProyecto = async () => {
    if (!proyectoActivo) return;
    const supabase = createClient();
    await supabase.from("viajes").update({ activo: false }).eq("id", proyectoActivo.id);
    setProyectoActivo(null); setTransacciones([]);
  };

  // Totales agrupados por moneda — soporta gastos mixtos USD/MXN/etc.
  const gastosPorMoneda: Record<string, number> = {};
  transacciones.filter(t => t.tipo === "gasto").forEach(t => {
    const mon = t.moneda || proyectoActivo?.moneda || "MXN";
    const monto = (mon !== "MXN" && t.monto_original != null) ? Number(t.monto_original) : Number(t.monto);
    gastosPorMoneda[mon] = (gastosPorMoneda[mon] || 0) + monto;
  });

  // Total en la moneda base del proyecto (para la barra de presupuesto)
  const monedaBase = proyectoActivo?.moneda || "MXN";
  const tc = proyectoActivo?.tipo_cambio || 1;
  const gastosTotalesMXN = transacciones.filter(t => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
  const gastosTotalesBase = monedaBase === "MXN" ? gastosTotalesMXN : gastosTotalesMXN / tc;

  const simbolo = SIMBOLOS[monedaBase] || "$";
  const presupuestoNum = proyectoActivo?.presupuesto || 0;
  const pctGastado = presupuestoNum > 0 ? Math.min((gastosTotalesBase / presupuestoNum) * 100, 100) : 0;
  const restante = Math.max(0, presupuestoNum - gastosTotalesBase);
  const esMultimoneda = Object.keys(gastosPorMoneda).length > 1;

  const inputStyle = { backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" };

  if (cargando) return <div style={{ padding: "60px 0", textAlign: "center" }}><p style={{ fontSize: 13, color: "var(--text-3)" }}>Cargando...</p></div>;

  return (
    <div style={{ padding: "16px 20px 120px" }}>
      <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>Separa gastos de un evento o proyecto específico</p>

      {!proyectoActivo && !creando && (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Sin proyecto activo</p>
          <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--text-3)" }}>Crea un proyecto para separar esos gastos y ver exactamente cuánto llevas</p>
          <button onClick={() => setCreando(true)} className="px-6 py-3 rounded-xl text-sm font-bold" style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}>Nuevo proyecto</button>
        </div>
      )}

      {creando && (
        <div className="rounded-2xl p-5 mb-4 space-y-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Nuevo proyecto</p>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Nombre</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Boda, USA 2026, Remodelación..." className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Moneda</label>
            <div className="flex gap-2">
              {["MXN", "USD", "EUR"].map(m => (
                <button key={m} type="button" onClick={() => setMoneda(m)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ backgroundColor: moneda === m ? "var(--gold-dim)" : "var(--surface-2)", border: moneda === m ? "1px solid var(--gold-border)" : "1px solid transparent", color: moneda === m ? "var(--gold)" : "var(--text-2)" }}>{m}</button>
              ))}
            </div>
          </div>
          {moneda !== "MXN" && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Tipo de cambio (1 {moneda} = ? MXN)</label>
              <input type="number" inputMode="decimal" value={tipoCambio} onChange={e => setTipoCambio(e.target.value)} placeholder="17.50" className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none" style={inputStyle} />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Presupuesto en {moneda} — opcional</label>
            <input type="number" inputMode="decimal" value={presupuesto} onChange={e => setPresupuesto(e.target.value)} placeholder="Ej. 50000" className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Fecha inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Fecha fin</label>
              <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none" style={inputStyle} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setCreando(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>Cancelar</button>
            <button onClick={crearProyecto} disabled={guardando || !nombre.trim()} className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50" style={{ backgroundColor: "var(--gold)", color: "#ffffff" }}>{guardando ? "Creando..." : "Activar proyecto"}</button>
          </div>
        </div>
      )}

      {proyectoActivo && (
        <>
          <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-base font-bold" style={{ color: "var(--text-1)" }}>🎯 {proyectoActivo.nombre}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  {proyectoActivo.moneda !== "MXN" ? `1 ${proyectoActivo.moneda} = $${proyectoActivo.tipo_cambio} MXN` : "Pesos mexicanos"}
                  {proyectoActivo.fecha_inicio ? ` · desde ${proyectoActivo.fecha_inicio}` : ""}
                  {proyectoActivo.fecha_fin ? ` hasta ${proyectoActivo.fecha_fin}` : ""}
                </p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ backgroundColor: "rgba(50,200,100,0.15)", color: "var(--success)" }}>ACTIVO</span>
            </div>

            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--text-3)" }}>Total gastado</p>
              {esMultimoneda ? (
                // Desglose por moneda cuando hay mezcla
                <div className="flex flex-wrap gap-3 mb-1">
                  {Object.entries(gastosPorMoneda).map(([mon, total]) => (
                    <div key={mon}>
                      <p className="text-3xl font-bold font-number" style={{ color: "var(--text-1)" }}>
                        {SIMBOLOS[mon] || "$"}{total.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: "var(--text-3)" }}>{mon}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-4xl font-bold font-number" style={{ color: "var(--text-1)" }}>
                  {simbolo}{gastosTotalesBase.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </p>
              )}
              {presupuestoNum > 0 && <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>de {simbolo}{presupuestoNum.toLocaleString("es-MX")} presupuestados</p>}
            </div>

            {presupuestoNum > 0 && (
              <div className="mb-4">
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctGastado}%`, backgroundColor: pctGastado >= 90 ? "var(--danger)" : pctGastado >= 70 ? "#f59e0b" : "var(--success)" }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <p className="text-[10px] font-number" style={{ color: "var(--text-3)" }}>{pctGastado.toFixed(0)}% usado</p>
                  <p className="text-[10px] font-number" style={{ color: pctGastado >= 90 ? "var(--danger)" : "var(--success)" }}>Quedan {simbolo}{restante.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
            )}

            <button onClick={terminarProyecto} className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.98]" style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border)" }}>Terminar proyecto</button>
          </div>

          <div className="rounded-xl px-4 py-3 mb-4 text-xs leading-relaxed" style={{ backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)", color: "var(--gold)" }}>
            💬 Dile a Lani cualquier gasto en MXN o USD — lo anota en el proyecto con su moneda. Ej: <span style={{ fontWeight: 700 }}>"50 dólares de comida"</span>
          </div>

          {transacciones.length > 0 ? (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="px-5 py-3.5 text-sm font-bold" style={{ color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>
                Gastos del proyecto ({transacciones.length})
                {esMultimoneda && <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--gold-dim)", color: "var(--gold)", border: "1px solid var(--gold-border)" }}>MULTIMONEDA</span>}
              </p>
              {transacciones.map((tx) => {
                const txMoneda = tx.moneda || monedaBase;
                const txSimbolo = SIMBOLOS[txMoneda] || "$";
                const montoOriginal = tx.monto_original != null ? Number(tx.monto_original) : null;
                const montoMostrar = montoOriginal != null && txMoneda !== "MXN"
                  ? `${txSimbolo}${montoOriginal.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                  : `$${Number(tx.monto).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                return (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--border-2)" }}>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>{tx.descripcion}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>{tx.categoria} · {tx.fecha}</p>
                        {txMoneda !== "MXN" && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--gold-dim)", color: "var(--gold)" }}>{txMoneda}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold font-number shrink-0" style={{ color: tx.tipo === "gasto" ? "var(--danger)" : "var(--success)" }}>{tx.tipo === "gasto" ? "-" : "+"}{montoMostrar}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--text-3)" }}>Aún no hay gastos en este proyecto. Dile algo a Lani.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: "metas",        label: "Metas" },
  { key: "presupuestos", label: "Presupuestos" },
  { key: "proyectos",    label: "Proyectos" },
];

export default function PlanificacionPage() {
  const [tabActiva, setTabActiva] = useState<Tab>("metas");

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header fijo */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, backgroundColor: "var(--bg)", borderBottom: "1px solid var(--border-2)", paddingTop: 52 }}>
        <div style={{ padding: "0 20px 0" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em", marginBottom: 14 }}>Planificación</h1>
        </div>
        {/* Tab bar */}
        <div style={{ display: "flex", padding: "0 20px", gap: 4 }}>
          {TABS.map(({ key, label }) => {
            const activa = tabActiva === key;
            return (
              <button
                key={key}
                onClick={() => setTabActiva(key)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: activa ? 700 : 500,
                  color: activa ? "var(--gold)" : "var(--text-3)",
                  backgroundColor: activa ? "var(--gold-dim)" : "transparent",
                  border: activa ? "1px solid var(--gold-border)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ height: 12 }} />
      </div>

      {/* Contenido */}
      {tabActiva === "metas"        && <SeccionMetas />}
      {tabActiva === "presupuestos" && <SeccionPresupuestos />}
      {tabActiva === "proyectos"    && <SeccionProyectos />}
    </main>
  );
}
