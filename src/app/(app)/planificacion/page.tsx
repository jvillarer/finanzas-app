"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import TourSheet from "@/components/TourSheet";
import { createClient } from "@/lib/supabase";
import { obtenerTransacciones, formatearMonto } from "@/lib/transacciones";
import { verificarPresupuestos } from "@/lib/notificaciones";
import {
  obtenerMetas, crearMeta, abonarMeta, eliminarMeta, actualizarMeta,
  calcularMeta, type Meta,
} from "@/lib/metas";
import type { Transaccion } from "@/lib/supabase";
import EditarTransaccion from "@/components/EditarTransaccion";

type Tab = "metas" | "presupuestos" | "movimientos";
type FiltroLista = "todos" | "gastos" | "ingresos";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes y helpers
// ─────────────────────────────────────────────────────────────────────────────
const VERDE = "#0F2F2F";
const MUTED = "rgba(15,47,47,0.55)";
const FAINT = "rgba(15,47,47,0.08)";

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

const CAT_ICON: Record<string, string> = {
  Comida: "🍽", Supermercado: "🛒", Transporte: "🚗",
  Entretenimiento: "🎬", Salud: "💊", Servicios: "⚡",
  Ropa: "👕", Hogar: "🏠", Educación: "📚", Otros: "📦",
};

function agruparPorFecha(txs: Transaccion[]): [string, Transaccion[]][] {
  const hoy = new Date().toISOString().split("T")[0];
  const ayer = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const grupos: Record<string, Transaccion[]> = {};
  for (const t of txs) {
    const label =
      t.fecha === hoy ? "Hoy" :
      t.fecha === ayer ? "Ayer" :
      new Date(t.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
    if (!grupos[label]) grupos[label] = [];
    grupos[label].push(t);
  }
  return Object.entries(grupos);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lock body scroll (modales iOS)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN: METAS
// ─────────────────────────────────────────────────────────────────────────────
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

  const inp = { width: "100%", borderRadius: 12, padding: "12px 14px", fontSize: 14, fontWeight: 500, outline: "none", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" } as const;

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
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>Ícono</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {EMOJIS_META.map((e) => (
              <button key={e} onClick={() => setEmoji(e)} style={{ width: 40, height: 40, borderRadius: 10, fontSize: 20, backgroundColor: emoji === e ? "var(--gold-dim)" : "var(--surface-2)", border: emoji === e ? "1px solid var(--gold-border)" : "1px solid transparent", cursor: "pointer" }}>{e}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>¿Para qué estás ahorrando?</p>
          <input type="text" placeholder="Ej. Vacaciones, iPhone, Carro..." value={nombre} onChange={(e) => setNombre(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>¿Cuánto necesitas?</p>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700, color: "var(--text-3)" }}>$</span>
            <input type="number" inputMode="decimal" placeholder="0.00" value={montoObjetivo} onChange={(e) => setMontoObjetivo(e.target.value)} className="font-number" style={{ ...inp, paddingLeft: 34, fontSize: 22, fontWeight: 800 }} />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>¿Para cuándo? (opcional)</p>
          <input type="date" value={fechaLimite} min={new Date().toISOString().split("T")[0]} onChange={(e) => setFechaLimite(e.target.value)} style={{ ...inp, colorScheme: "light" as const }} />
          {fechaLimite && <button onClick={() => setFechaLimite("")} style={{ marginTop: 6, fontSize: 11, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>× Quitar fecha límite</button>}
        </div>
        {error && <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, backgroundColor: "rgba(217,74,74,0.08)", border: "1px solid rgba(217,74,74,0.2)" }}><p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>{error}</p></div>}
        <button onClick={handleGuardar} disabled={guardando} className="active:scale-[0.98] transition-transform" style={{ width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, backgroundColor: VERDE, color: "#ffffff", border: "none", cursor: "pointer", opacity: guardando ? 0.4 : 1 }}>
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
    await actualizarMeta(meta.id, { nombre: editNombre.trim(), emoji: editEmoji, monto_objetivo: Number(editObjetivo), fecha_limite: null });
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
            <button onClick={handleGuardarEdit} disabled={guardandoEdit} className="active:scale-[0.98] transition-transform" style={{ width: "100%", padding: "12px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: VERDE, color: "#ffffff", border: "none", cursor: "pointer", opacity: guardandoEdit ? 0.5 : 1 }}>
              {guardandoEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}
        <div style={{ marginBottom: 20 }}>
          <div style={{ width: "100%", height: 4, borderRadius: 99, backgroundColor: "var(--surface-3)" }}>
            <div style={{ height: 4, borderRadius: 99, width: `${calc.pct}%`, backgroundColor: calc.completada ? "var(--success)" : VERDE, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>{calc.pct.toFixed(0)}% completado</p>
            <p style={{ fontSize: 11, color: "var(--text-3)" }}>Falta {formatearMonto(calc.restante)}</p>
          </div>
        </div>
        {!calc.completada && (
          <>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>¿Cuánto abonás hoy?</p>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700, color: "var(--text-3)" }}>$</span>
              <input type="number" inputMode="decimal" placeholder="0.00" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} className="font-number" style={{ width: "100%", borderRadius: 12, paddingLeft: 34, paddingRight: 14, paddingTop: 14, paddingBottom: 14, fontSize: 26, fontWeight: 800, outline: "none", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)" }} />
            </div>
            <button onClick={handleAbonar} disabled={guardando || !monto || Number(monto) <= 0} className="active:scale-[0.98] transition-transform" style={{ width: "100%", padding: "14px 0", borderRadius: 12, marginBottom: 10, fontSize: 14, fontWeight: 700, backgroundColor: VERDE, color: "#ffffff", border: "none", cursor: "pointer", opacity: (guardando || !monto || Number(monto) <= 0) ? 0.4 : 1 }}>
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
  const pctTotal = totalObjetivo > 0 ? Math.min((totalAhorrado / totalObjetivo) * 100, 100) : 0;

  return (
    <div style={{ padding: "18px 20px 120px" }}>
      {/* Título sección */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <p style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>Tus metas</p>
          <h2 className="font-display" style={{ fontSize: 28, color: VERDE, fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.3px", marginTop: 2, lineHeight: 1.05 }}>Hacia dónde vas</h2>
        </div>
        <button
          onClick={() => setModalCrear(true)}
          style={{ height: 36, paddingLeft: 14, paddingRight: 14, borderRadius: 18, background: VERDE, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, marginTop: 4, flexShrink: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva
        </button>
      </div>

      {/* Card resumen oscura */}
      {!cargando && metas.length > 0 && (
        <div style={{ background: VERDE, borderRadius: 22, padding: "18px 20px", marginTop: 18, color: "#fff", position: "relative", overflow: "hidden", boxShadow: "0 6px 20px rgba(15,47,47,0.18)" }}>
          {/* Lani watermark */}
          <div style={{ position: "absolute", right: -10, bottom: -10, width: 100, height: 100, opacity: 0.15, pointerEvents: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lani_chat.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>Ahorrado en total</p>
          <h2 className="font-display" style={{ fontSize: 42, fontWeight: 400, fontStyle: "italic", color: "#fff", marginTop: 2, letterSpacing: "-1px", lineHeight: 1 }}>
            {formatearMonto(totalAhorrado)}
          </h2>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4, fontWeight: 500 }}>
            de {formatearMonto(totalObjetivo)} · {pctTotal.toFixed(0)}% completo
          </p>
          <div style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, marginTop: 12, overflow: "hidden", position: "relative", zIndex: 1 }}>
            <div style={{ height: "100%", width: `${pctTotal}%`, background: "#7dd3a8", borderRadius: 3, transition: "width 0.7s" }} />
          </div>
        </div>
      )}

      {/* Lista de metas */}
      {cargando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 18 }} />)}
        </div>
      ) : metas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", borderRadius: 20, backgroundColor: "var(--surface)", border: `1px solid ${FAINT}`, marginTop: 18 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: VERDE, marginBottom: 6 }}>Sin metas todavía</p>
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, marginBottom: 20 }}>Define a dónde quieres llegar con tu dinero.</p>
          <button onClick={() => setModalCrear(true)} style={{ padding: "10px 22px", borderRadius: 18, fontSize: 13, fontWeight: 700, backgroundColor: VERDE, color: "#fff", border: "none", cursor: "pointer" }}>Crear mi primera meta</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {metas.map((meta) => {
            const calc = calcularMeta(meta);
            const barColor = calc.completada ? "var(--success)" : calc.urgente ? "var(--danger)" : VERDE;
            return (
              <button key={meta.id} onClick={() => setModalAbonar(meta)} className="active:scale-[0.98] transition-transform" style={{ width: "100%", textAlign: "left", padding: 14, borderRadius: 18, backgroundColor: "#fff", border: `1px solid ${FAINT}`, cursor: "pointer", boxShadow: "0 1px 2px rgba(15,47,47,0.04)", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: "#f5f7f5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{meta.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: VERDE, letterSpacing: "-0.1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta.nombre}</span>
                    <span className="font-display" style={{ fontSize: 15, fontWeight: 700, fontStyle: "italic", color: barColor, flexShrink: 0 }}>{calc.pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{formatearMonto(meta.monto_actual)} / {formatearMonto(meta.monto_objetivo)}</span>
                    {calc.diasRestantes !== null && !calc.completada && (
                      <span style={{ fontSize: 10, color: calc.urgente ? "var(--danger)" : MUTED, fontWeight: 600 }}>{calc.diasRestantes > 0 ? `${calc.diasRestantes} días` : "Venció"}</span>
                    )}
                  </div>
                  <div style={{ height: 5, background: FAINT, borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${calc.pct}%`, background: barColor, borderRadius: 3, transition: "width 0.6s" }} />
                  </div>
                </div>
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

  // Mismo patrón que NuevaTransaccion: bloquear overflow del body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", touchAction: "none" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className="w-full slide-up"
        style={{
          backgroundColor: "var(--surface)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderTop: "1px solid var(--border)",
          maxHeight: "92dvh",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
          <div style={{ width: 32, height: 4, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "#f5f7f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{emoji}</div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: VERDE }}>{categoria}</p>
              <p style={{ fontSize: 12, color: MUTED }}>Límite mensual</p>
            </div>
          </div>
        </div>

        {/* Zona scrolleable — iOS hace scroll para mostrar el input enfocado */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>Monto límite</label>
          <div style={{ position: "relative", marginBottom: 20 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700, color: MUTED }}>$</span>
            <input
              type="number" inputMode="decimal" placeholder="0.00"
              value={valor} onChange={(e) => setValor(e.target.value)}
              autoFocus
              className="font-number"
              style={{ width: "100%", borderRadius: 12, paddingLeft: 34, paddingRight: 14, paddingTop: 14, paddingBottom: 14, fontSize: 26, fontWeight: 800, outline: "none", backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: VERDE }}
            />
          </div>
          <button
            onClick={() => { if (Number(valor) > 0) onGuardar(Number(valor)); }}
            style={{ width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 14, fontWeight: 700, backgroundColor: VERDE, color: "#fff", border: "none", cursor: "pointer", marginBottom: 10 }}
          >
            Guardar presupuesto
          </button>
          {onEliminar && (
            <button
              onClick={onEliminar}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, backgroundColor: "rgba(217,74,74,0.08)", color: "var(--danger)", border: "1px solid rgba(217,74,74,0.15)", cursor: "pointer" }}
            >
              Quitar presupuesto
            </button>
          )}
        </div>
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
  const mesLabel = new Date().toLocaleString("es-MX", { month: "long", year: "numeric" }).replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div style={{ padding: "18px 20px 120px" }}>
      {/* Título sección */}
      <p style={{ fontSize: 11, color: MUTED, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>{mesLabel}</p>
      <h2 className="font-display" style={{ fontSize: 28, color: VERDE, fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.3px", marginTop: 2, lineHeight: 1.05, marginBottom: 0 }}>Límites por categoría</h2>

      {/* Card resumen */}
      {!cargando && conPresupuesto.length > 0 && (
        <div style={{ marginTop: 18, background: "#f5f7f5", borderRadius: 18, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>Total gastado</p>
            <p className="font-display" style={{ fontSize: 24, color: VERDE, fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.5px", marginTop: 2, lineHeight: 1 }}>{formatearMonto(totalGastado)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: MUTED, fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>De {formatearMonto(totalLimite)} límite</p>
            <p style={{ fontSize: 13, color: VERDE, fontWeight: 600, marginTop: 4 }}>{totalLimite > 0 ? `${Math.round((totalGastado / totalLimite) * 100)}% usado` : "—"}</p>
          </div>
        </div>
      )}

      {cargando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {conDatos.map((cat) => {
            const pasado = cat.limite > 0 && cat.gastado > cat.limite;
            const cerca = cat.limite > 0 && cat.pct >= 80 && !pasado;
            const barColor = pasado ? "var(--danger)" : cerca ? "var(--warning)" : VERDE;
            return (
              <button
                key={cat.categoria}
                onClick={() => setModal({ categoria: cat.categoria, emoji: cat.emoji, limiteActual: cat.limite || undefined, id: cat.id })}
                className="active:scale-[0.98] transition-transform"
                style={{ width: "100%", textAlign: "left", background: "#fff", borderRadius: 16, padding: "12px 14px", border: `1px solid ${pasado ? "rgba(217,74,74,0.3)" : FAINT}`, boxShadow: "0 1px 2px rgba(15,47,47,0.04)", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 11, background: "#f5f7f5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cat.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: VERDE }}>{cat.categoria}</span>
                    {cat.limite > 0 ? (
                      <span style={{ fontSize: 12, color: pasado ? "var(--danger)" : MUTED, fontWeight: 600 }}>
                        {formatearMonto(cat.gastado)} / <span style={{ color: MUTED }}>{formatearMonto(cat.limite)}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: MUTED, fontWeight: 500, fontStyle: "italic" }}>Sin límite</span>
                    )}
                  </div>
                  {cat.limite > 0 && (
                    <div style={{ height: 4, background: FAINT, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${cat.pct}%`, background: barColor, borderRadius: 2 }} />
                    </div>
                  )}
                </div>
                {cat.limite === 0 && (
                  <div style={{ background: "transparent", border: `1px solid ${FAINT}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: VERDE, flexShrink: 0 }}>
                    Definir
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {modal && <ModalPresupuesto categoria={modal.categoria} emoji={modal.emoji} limiteActual={modal.limiteActual} onGuardar={(limite) => guardarPresupuesto(modal.categoria, limite)} onEliminar={modal.id ? () => eliminarPresupuesto(modal.id!) : undefined} onCerrar={() => setModal(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN: MOVIMIENTOS
// ─────────────────────────────────────────────────────────────────────────────
function SeccionMovimientos() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<FiltroLista>("todos");
  const [pagina, setPagina] = useState(30);
  const [transaccionEditar, setTransaccionEditar] = useState<Transaccion | null>(null);

  useEffect(() => {
    obtenerTransacciones().then(setTransacciones).finally(() => setCargando(false));
  }, []);

  useEffect(() => { setPagina(30); }, [filtro]);

  // Sparkline últimos 7 días — se actualiza según filtro activo
  const sparkline7d = useMemo(() => {
    const hoy = new Date();
    const tipoFiltro = filtro === "ingresos" ? "ingreso" : "gasto";
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy); d.setDate(hoy.getDate() - (6 - i));
      const fecha = d.toISOString().split("T")[0];
      if (filtro === "todos") {
        // Todos: muestra gastos menos ingresos (gasto neto) para cada día
        const gastos = transacciones.filter((t) => t.tipo === "gasto" && t.fecha === fecha).reduce((s, t) => s + Number(t.monto), 0);
        const ingresos = transacciones.filter((t) => t.tipo === "ingreso" && t.fecha === fecha).reduce((s, t) => s + Number(t.monto), 0);
        return Math.max(gastos - ingresos, 0);
      }
      return transacciones.filter((t) => t.tipo === tipoFiltro && t.fecha === fecha).reduce((s, t) => s + Number(t.monto), 0);
    });
  }, [transacciones, filtro]);

  const maxSpark = Math.max(...sparkline7d, 1);
  const DIAS_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];
  const hoyDow = new Date().getDay(); // 0=dom
  const diasLabels = Array.from({ length: 7 }, (_, i) => {
    const d = (hoyDow - 6 + i + 7) % 7;
    return DIAS_CORTOS[d === 0 ? 6 : d - 1];
  });

  // Total últimos 7 días según filtro
  const total7d = sparkline7d.reduce((s, v) => s + v, 0);
  const labelTotal7d = filtro === "ingresos" ? `+${formatearMonto(total7d)}` : `−${formatearMonto(total7d)}`;

  // Fechas de los últimos 7 días
  const fechas7d = useMemo(() => {
    const hoy = new Date();
    return new Set(Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy); d.setDate(hoy.getDate() - i);
      return d.toISOString().split("T")[0];
    }));
  }, []);

  const conteos = useMemo(() => ({
    todos: transacciones.filter((t) => fechas7d.has(t.fecha)).length,
    gastos: transacciones.filter((t) => t.tipo === "gasto" && fechas7d.has(t.fecha)).length,
    ingresos: transacciones.filter((t) => t.tipo === "ingreso" && fechas7d.has(t.fecha)).length,
  }), [transacciones, fechas7d]);

  const listaBase = transacciones.filter((t) => {
    const dentroDeRango = fechas7d.has(t.fecha);
    const porTipo = filtro === "todos" ? true : filtro === "gastos" ? t.tipo === "gasto" : t.tipo === "ingreso";
    return dentroDeRango && porTipo;
  });
  const lista = listaBase.slice(0, pagina);
  const hayMas = listaBase.length > pagina;
  const grupos = agruparPorFecha(lista);

  return (
    <div style={{ paddingTop: 18, paddingBottom: 120 }}>

      {/* Hero card oscura */}
      <div style={{ paddingLeft: 20, paddingRight: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #0F2F2F 0%, #1f4640 100%)", borderRadius: 22, padding: "18px 20px", color: "#fff", position: "relative", overflow: "hidden", boxShadow: "0 6px 20px rgba(15,47,47,0.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                {filtro === "ingresos" ? "Ingresos · 7 días" : filtro === "gastos" ? "Gastos · 7 días" : "Neto · 7 días"}
              </p>
              <h2 className="font-display" style={{ fontSize: 34, fontWeight: 400, fontStyle: "italic", color: "#fff", marginTop: 2, letterSpacing: "-1px", lineHeight: 1 }}>
                {cargando ? "—" : labelTotal7d}
              </h2>
            </div>
          </div>
          {/* Mini sparkline */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginTop: 14, height: 40 }}>
            {sparkline7d.map((v, i) => {
              const h = Math.max((v / maxSpark) * 36, 3);
              return (
                <div key={i} style={{ flex: 1, height: h, background: i === 6 ? "#7dd3a8" : "rgba(255,255,255,0.25)", borderRadius: 3 }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {diasLabels.map((d, i) => (
              <span key={i} style={{ fontSize: 9, color: i === 6 ? "#7dd3a8" : "rgba(255,255,255,0.4)", fontWeight: 700, flex: 1, textAlign: "center" }}>{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ paddingLeft: 20, paddingRight: 20, marginTop: 16, display: "flex", gap: 8, overflowX: "auto" }} className="no-scroll">
        {([
          { key: "todos" as FiltroLista, label: "Todos", count: conteos.todos },
          { key: "gastos" as FiltroLista, label: "Gastos", count: conteos.gastos },
          { key: "ingresos" as FiltroLista, label: "Ingresos", count: conteos.ingresos },
        ]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            style={{ flexShrink: 0, height: 34, paddingLeft: 14, paddingRight: 10, borderRadius: 17, border: `1px solid ${filtro === key ? VERDE : FAINT}`, background: filtro === key ? VERDE : "#fff", color: filtro === key ? "#fff" : VERDE, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
          >
            {label}
            <span style={{ background: filtro === key ? "rgba(255,255,255,0.2)" : FAINT, color: filtro === key ? "#fff" : MUTED, borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {cargando ? (
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 16 }} />)}
        </div>
      ) : transacciones.length === 0 ? (
        <div style={{ margin: "16px 20px", textAlign: "center", padding: "48px 20px", borderRadius: 20, backgroundColor: "#fff", border: `1px solid ${FAINT}` }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💸</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: VERDE, marginBottom: 6 }}>Sin movimientos</p>
          <p style={{ fontSize: 12, color: MUTED }}>Registra tus gastos con Lani o con el botón +</p>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          {grupos.map(([fecha, txs]) => {
            const totalGrupo = txs.filter((t) => t.tipo === "gasto").reduce((s, t) => s + Number(t.monto), 0);
            return (
              <div key={fecha} style={{ marginBottom: 18 }}>
                <div style={{ paddingLeft: 20, paddingRight: 20, display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "1px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{fecha}</span>
                  <div style={{ flex: 1, height: 1, background: FAINT }} />
                  {totalGrupo > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>−{formatearMonto(totalGrupo)}</span>}
                </div>
                <div style={{ paddingLeft: 20, paddingRight: 20 }}>
                  <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${FAINT}`, boxShadow: "0 1px 2px rgba(15,47,47,0.04)", overflow: "hidden" }}>
                    {txs.map((t, idx) => {
                      const emoji = t.tipo === "ingreso" ? "💰" : (CAT_ICON[t.categoria] || "📦");
                      const esIngreso = t.tipo === "ingreso";
                      return (
                        <div
                          key={t.id}
                          onClick={() => setTransaccionEditar(t)}
                          style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, borderTop: idx > 0 ? `1px solid ${FAINT}` : "none", cursor: "pointer" }}
                          onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "#f5f7f5")}
                          onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: 11, background: "#f5f7f5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{emoji}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: VERDE, letterSpacing: "-0.1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t.descripcion || t.categoria || "Sin descripción"}
                            </p>
                            <p style={{ fontSize: 11, color: MUTED, fontWeight: 500, marginTop: 1 }}>{t.categoria}</p>
                          </div>
                          <span className="font-display" style={{ fontSize: 16, fontWeight: 700, fontStyle: "italic", color: esIngreso ? "var(--success)" : "var(--danger)", letterSpacing: "-0.3px", flexShrink: 0 }}>
                            {esIngreso ? "+" : "−"}{formatearMonto(t.monto)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {hayMas && (
            <div style={{ paddingLeft: 20, paddingRight: 20 }}>
              <button
                onClick={() => setPagina((p) => p + 30)}
                style={{ width: "100%", padding: "13px 0", borderRadius: 14, fontSize: 12, fontWeight: 600, backgroundColor: "#fff", color: MUTED, border: `1px solid ${FAINT}`, cursor: "pointer" }}
              >
                Ver más ({listaBase.length - pagina} restantes)
              </button>
            </div>
          )}
        </div>
      )}

      {transaccionEditar && (
        <EditarTransaccion
          transaccion={transaccionEditar}
          onCerrar={() => setTransaccionEditar(null)}
          onGuardado={() => { setTransaccionEditar(null); obtenerTransacciones().then(setTransacciones); }}
          onEliminado={() => { setTransaccionEditar(null); obtenerTransacciones().then(setTransacciones); }}
        />
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
  { key: "movimientos",  label: "Movimientos" },
];

export default function PlanificacionPage() {
  const [tabActiva, setTabActiva] = useState<Tab>("metas");
  const [showTour, setShowTour] = useState(false);

  return (
    <main style={{ height: "100dvh", display: "flex", flexDirection: "column", backgroundColor: "#0F2F2F", overflow: "hidden" }}>

      <TourSheet
        tourKey="lani_tour_planificacion"
        titulo="Planificación financiera"
        subtitulo="Tres herramientas para controlar tu dinero"
        pasos={[
          { icono: "🎯", titulo: "Metas de ahorro", desc: "Define para qué estás ahorrando (vacaciones, iPhone, emergencias) y lleva el progreso con abonos." },
          { icono: "📊", titulo: "Presupuestos", desc: "Pon límites de gasto por categoría cada mes. Lani te manda alerta antes de que te pases del tope." },
          { icono: "📋", titulo: "Movimientos", desc: "Historial completo de tus gastos e ingresos. Filtra por tipo y toca cualquier transacción para editarla o borrarla." },
        ]}
        abierto={showTour}
        onCerrar={() => setShowTour(false)}
      />

      {/* ── HEADER — no sticky, permanece fijo en el flex ── */}
      <div style={{
        flexShrink: 0,
        backgroundColor: "#0F2F2F",
        paddingTop: "calc(env(safe-area-inset-top) + 14px)",
        paddingLeft: 20, paddingRight: 20,
        paddingBottom: 14,
      }}>
        {/* Título + botón ayuda */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase" }}>Lani · Plan</p>
            <h1 className="font-display" style={{ fontSize: 30, color: "#fff", fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.5px", lineHeight: 1, marginTop: 2 }}>Planificación</h1>
          </div>
          <button
            onClick={() => setShowTour(true)}
            style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.85)", cursor: "pointer", flexShrink: 0 }}
            aria-label="Cómo funciona"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
        </div>

        {/* Tabs — segmento pill */}
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: 4, display: "flex", gap: 4 }}>
          {TABS.map(({ key, label }) => {
            const activa = tabActiva === key;
            return (
              <button
                key={key}
                onClick={() => setTabActiva(key)}
                style={{ flex: 1, height: 34, border: "none", cursor: "pointer", borderRadius: 11, background: activa ? "#fff" : "transparent", color: activa ? VERDE : "rgba(255,255,255,0.65)", fontSize: 12.5, fontWeight: 700, boxShadow: activa ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido — scroll propio, el header nunca se mueve */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        backgroundColor: "var(--bg)",
        borderRadius: "24px 24px 0 0",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 64px)",
      }}>
        {tabActiva === "metas"        && <SeccionMetas />}
        {tabActiva === "presupuestos" && <SeccionPresupuestos />}
        {tabActiva === "movimientos"  && <SeccionMovimientos />}
      </div>
    </main>
  );
}
