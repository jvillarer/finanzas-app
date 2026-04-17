"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { haptico } from "@/lib/haptics";

// ─── Tokens de diseño ─────────────────────────────────────────
const C = {
  bg:          "#F5F3EE",
  surface:     "#FFFFFF",
  surface2:    "#FBFAF6",
  line:        "rgba(14,14,16,0.08)",
  divider:     "rgba(14,14,16,0.06)",
  text:        "#0E0E10",
  textDim:     "rgba(14,14,16,0.56)",
  textFaint:   "rgba(14,14,16,0.38)",
  accent:      "#2F8F87",
  accentSoft:  "rgba(47,143,135,0.10)",
  accentLine:  "rgba(47,143,135,0.24)",
  gold:        "#E4B94A",
  green:       "#1F9D55",
  red:         "#D94A4A",
  amber:       "#D08B2C",
};

const F = {
  sans:    "var(--font-sans), -apple-system, system-ui, sans-serif",
  display: "var(--font-display), 'Times New Roman', serif",
  mono:    "var(--font-mono), ui-monospace, monospace",
};

// ─── Categorías ───────────────────────────────────────────────
const CATEGORIAS = [
  { id: "comida",       nombre: "Comida",         desc: "Restaurantes, tacos, cafés" },
  { id: "super",        nombre: "Supermercado",   desc: "Walmart, Soriana, despensa" },
  { id: "transporte",   nombre: "Transporte",     desc: "Uber, gasolina, taxi" },
  { id: "entret",       nombre: "Entretenimiento",desc: "Cine, Spotify, Netflix" },
  { id: "salud",        nombre: "Salud",          desc: "Médico, farmacia, gym" },
  { id: "servicios",    nombre: "Servicios",      desc: "Luz, agua, internet" },
  { id: "ropa",         nombre: "Ropa",           desc: "Vestuario, accesorios" },
  { id: "hogar",        nombre: "Hogar",          desc: "Muebles, limpieza" },
  { id: "educacion",    nombre: "Educación",      desc: "Libros, cursos, colegiatura" },
  { id: "otros",        nombre: "Otros",          desc: "Cualquier otro gasto" },
];

const TOTAL_PASOS = 5;
const PASO_CATEGORIAS = 2;

// ─── Primitivos de UI ─────────────────────────────────────────

function ProgressDots({ paso }: { paso: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {Array.from({ length: TOTAL_PASOS }).map((_, i) => {
        const activo = i === paso;
        const listo  = i < paso;
        return (
          <div key={i} style={{
            height: 3,
            width: activo ? 22 : 12,
            borderRadius: 99,
            background: activo ? C.text : listo ? "rgba(14,14,16,0.38)" : "rgba(14,14,16,0.12)",
            transition: "all 360ms cubic-bezier(0.2,0.9,0.3,1)",
          }} />
        );
      })}
    </div>
  );
}

function Chrome({ paso, onSaltar, esUltimo, children }: {
  paso: number; onSaltar: () => void; esUltimo: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      backgroundColor: C.bg, color: C.text, fontFamily: F.sans,
      paddingTop: "env(safe-area-inset-top, 44px)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px 0",
      }}>
        <ProgressDots paso={paso} />
        {!esUltimo ? (
          <button onClick={onSaltar} style={{
            background: "none", border: "none", padding: 0,
            color: C.textFaint, fontFamily: F.sans, fontSize: 13,
            cursor: "pointer", fontWeight: 400,
          }}>Saltar</button>
        ) : <div style={{ width: 30 }} />}
      </div>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: F.mono, fontSize: 10, letterSpacing: 2.2,
      color: C.textFaint, textTransform: "uppercase", padding: "0 24px",
    }}>{children}</div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: F.display, fontWeight: 300,
      fontSize: 34, lineHeight: 1.08, letterSpacing: -1.2,
      color: C.text, padding: "10px 24px 0",
    }}>{children}</div>
  );
}

function Descripcion({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: F.sans, fontSize: 14.5, lineHeight: 1.5,
      color: C.textDim, padding: "12px 24px 0", letterSpacing: -0.1,
      maxWidth: 330,
    }}>{children}</div>
  );
}

function BotonPrimario({ children, onClick, disabled, cargando }: {
  children: React.ReactNode; onClick: () => void;
  disabled?: boolean; cargando?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || cargando}
      style={{
        width: "100%", height: 52, borderRadius: 12, border: "none",
        background: disabled ? "rgba(14,14,16,0.12)" : C.text,
        color: disabled ? C.textFaint : "#FFF",
        fontFamily: F.sans, fontSize: 15, fontWeight: 500,
        letterSpacing: -0.1, cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        transition: "transform 120ms ease, background 200ms ease",
      }}
    >
      {cargando ? (
        <>
          <span style={{
            width: 14, height: 14, borderRadius: 99,
            border: "1.5px solid rgba(255,255,255,0.25)",
            borderTopColor: "#fff",
            display: "inline-block",
            animation: "lani-spin 700ms linear infinite",
          }} />
          <span>Guardando</span>
        </>
      ) : children}
    </button>
  );
}

function Pie({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "16px 24px",
      paddingBottom: "calc(16px + env(safe-area-inset-bottom, 20px))",
      marginTop: "auto",
    }}>{children}</div>
  );
}

// LaniCircle — máscara circular sobre el PNG, centrada en la cara
function LaniCircle({ size = 72, pose = "hi", ring = true, ringColor }: {
  size?: number; pose?: "hi" | "wave" | "happy" | "shy"; ring?: boolean; ringColor?: string;
}) {
  const poses: Record<string, { src: string; fx: number; fy: number }> = {
    hi:    { src: "/lani-hi.png",    fx: 50, fy: 40 },
    wave:  { src: "/lani-wave.png",  fx: 48, fy: 42 },
    happy: { src: "/lani-happy.png", fx: 50, fy: 40 },
    shy:   { src: "/lani-shy.png",   fx: 50, fy: 40 },
  };
  const p = poses[pose] ?? poses.hi;
  const bgH = size * 1.85;
  const bgW = bgH * (480 / 360);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {ring && (
        <div style={{
          position: "absolute", inset: -3, borderRadius: 999,
          border: `1px solid ${ringColor ?? C.accentLine}`,
        }} />
      )}
      <div style={{
        width: size, height: size, borderRadius: 999,
        background: "linear-gradient(145deg, #F5F3EE 0%, #E8E4DA 100%)",
        overflow: "hidden",
        boxShadow: "inset 0 0 0 0.5px rgba(14,14,16,0.08), 0 2px 6px rgba(14,14,16,0.06)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${p.src})`,
          backgroundSize: `${bgW}px ${bgH}px`,
          backgroundPosition: `${p.fx}% ${p.fy}%`,
          backgroundRepeat: "no-repeat",
        }} />
      </div>
    </div>
  );
}

// LaniNote — avatar + "Lani" label + frase, encima del CTA
function LaniNote({ pose = "hi", children }: {
  pose?: "hi" | "wave" | "happy" | "shy"; children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px 10px 10px", marginBottom: 10,
    }}>
      <LaniCircle size={40} pose={pose} ring={false} />
      <div style={{
        fontFamily: F.sans, fontSize: 12.5, color: C.textDim,
        lineHeight: 1.4, letterSpacing: -0.1,
      }}>
        <span style={{
          fontFamily: F.mono, fontSize: 9, letterSpacing: 1.4,
          color: C.accent, textTransform: "uppercase",
          fontWeight: 500, marginRight: 6,
        }}>Lani</span>
        {children}
      </div>
    </div>
  );
}

// ─── Paso 1: Console (hero con typing animation) ──────────────
function Paso1({ onSiguiente, onSaltar, nombre }: {
  onSiguiente: () => void; onSaltar: () => void; nombre: string;
}) {
  const textoCompleto = "Puedo leer tu estado de cuenta, categorizar cada movimiento y decirte a dónde se va tu dinero — antes de que te preguntes.";
  const [escrito, setEscrito] = useState(0);
  const [pulsando, setPulsando] = useState(false);

  useEffect(() => {
    if (escrito >= textoCompleto.length) return;
    const t = setTimeout(() => setEscrito((n) => n + 2), 24);
    return () => clearTimeout(t);
  }, [escrito, textoCompleto.length]);

  return (
    <Chrome paso={0} onSaltar={onSaltar} esUltimo={false}>
      <style>{`
        @keyframes lani-spin  { to { transform: rotate(360deg); } }
        @keyframes lani-pulse { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes lani-cursor { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }
      `}</style>

      <div style={{ padding: "20px 16px 0", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Cabecera del sistema */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.6,
          color: C.textFaint, textTransform: "uppercase",
          padding: "0 4px 12px",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: 99, background: C.green,
            animation: "lani-pulse 2s infinite",
            display: "inline-block",
          }} />
          <span>Asistente · Sesión iniciada</span>
          <span style={{ flex: 1, height: 0.5, background: C.line, display: "inline-block" }} />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>00:00:04</span>
        </div>

        {/* Tarjeta principal */}
        <div style={{
          background: C.surface,
          border: `0.5px solid ${C.line}`,
          borderRadius: 16,
          boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          overflow: "hidden",
        }}>
          {/* Identidad */}
          <div style={{ padding: "18px 18px 14px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <LaniCircle size={56} ringColor={C.accentLine} />
            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
              <div style={{
                fontFamily: F.mono, fontSize: 9, letterSpacing: 1.8,
                color: C.textFaint, textTransform: "uppercase", marginBottom: 6,
              }}>Hola{nombre ? `, ${nombre}` : ""}</div>
              <div style={{
                fontFamily: F.display, fontSize: 30, lineHeight: 1,
                letterSpacing: -1.2, color: C.text, fontWeight: 300, fontStyle: "italic",
              }}>
                Soy Lani<span style={{ color: C.accent, fontStyle: "normal" }}>.</span>
              </div>
              <div style={{
                marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: F.mono, fontSize: 9.5, color: C.textDim, letterSpacing: 0.4,
              }}>
                <span>ASSISTANT·ID</span>
                <span style={{ color: C.text, fontWeight: 500, letterSpacing: 0.8 }}>LN-042</span>
              </div>
            </div>
          </div>

          {/* Mensaje con typing */}
          <div style={{
            padding: "14px 18px 16px",
            borderTop: `0.5px solid ${C.line}`,
            background: C.surface2,
          }}>
            <div style={{
              fontFamily: F.mono, fontSize: 8.5, letterSpacing: 1.6,
              color: C.textFaint, textTransform: "uppercase", marginBottom: 6,
            }}>Mensaje</div>
            <div style={{
              fontFamily: F.sans, fontSize: 14, lineHeight: 1.5,
              color: C.text, letterSpacing: -0.1, minHeight: 84,
            }}>
              {textoCompleto.slice(0, escrito)}
              <span style={{
                display: "inline-block", width: 7, height: 14, verticalAlign: -2,
                background: C.accent, marginLeft: 2,
                animation: "lani-cursor 1s infinite",
              }} />
            </div>
          </div>

          {/* Grid de capacidades */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            borderTop: `0.5px solid ${C.line}`,
          }}>
            {[
              { k: "PDF",  v: "Bancos" },
              { k: "CHAT", v: "Registro" },
              { k: "AI",   v: "Análisis" },
            ].map((c, i) => (
              <div key={i} style={{
                padding: "12px 10px",
                borderLeft: i > 0 ? `0.5px solid ${C.line}` : "none",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: F.mono, fontSize: 9, letterSpacing: 1.4,
                  color: C.accent, marginBottom: 3, fontWeight: 500,
                }}>{c.k}</div>
                <div style={{ fontSize: 11.5, color: C.textDim, letterSpacing: -0.05 }}>{c.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Teaser "Próximo" */}
        <div style={{
          marginTop: 14, display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          background: C.accentSoft,
          border: `0.5px solid ${C.accentLine}`,
          borderRadius: 12,
        }}>
          <div style={{
            fontFamily: F.mono, fontSize: 9, letterSpacing: 1.4,
            color: C.accent, fontWeight: 500, textTransform: "uppercase",
          }}>Próximo</div>
          <div style={{ flex: 1, fontSize: 12.5, color: C.textDim, letterSpacing: -0.05 }}>
            3 min · 4 pasos para conocerte
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 11, color: C.text }}>→</div>
        </div>
      </div>

      <Pie>
        <BotonPrimario onClick={onSiguiente}>Empezar</BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 2: Importa tu banco ─────────────────────────────────
function Paso2({ onSiguiente, onSaltar }: { onSiguiente: () => void; onSaltar: () => void }) {
  const txns = [
    { n: "Uber",    cat: "Transporte",      a: -280 },
    { n: "Netflix", cat: "Entretenimiento", a: -219 },
    { n: "Nómina",  cat: "Ingreso",         a: 18000, ingreso: true },
    { n: "CFE",     cat: "Servicios",       a: -640 },
  ];

  return (
    <Chrome paso={1} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 02 · Importación</Eyebrow>
          <Titulo>Importa tu banco.</Titulo>
          <Descripcion>
            Sube el PDF de tu estado de cuenta. Yo extraigo todas las transacciones.
          </Descripcion>
        </div>

        <div style={{ padding: "22px 20px 0" }}>
          {/* Tarjeta de archivo */}
          <div style={{
            background: C.surface, borderRadius: 16,
            border: `0.5px solid ${C.line}`, padding: "14px",
            boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 48, borderRadius: 6,
                background: C.surface2, border: `0.5px solid ${C.line}`,
                position: "relative", display: "flex",
                alignItems: "flex-end", justifyContent: "center", paddingBottom: 6,
              }}>
                <div style={{
                  position: "absolute", top: 0, right: 0,
                  width: 10, height: 10, background: C.bg,
                  borderLeft: `0.5px solid ${C.line}`,
                  borderBottom: `0.5px solid ${C.line}`,
                }} />
                <div style={{ fontFamily: F.mono, fontSize: 8, color: C.textFaint }}>PDF</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text }}>
                  BBVA_Enero_2026.pdf
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.textFaint, marginTop: 3 }}>
                  2.3 MB · Estado de cuenta
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: C.green, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 12 12">
                  <path d="M2.5 6l2.5 2.5 4.5-5" stroke={C.green} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Listo
              </div>
            </div>
            <div style={{
              marginTop: 12, height: 2.5, borderRadius: 99,
              background: "rgba(31,157,85,0.12)", overflow: "hidden",
            }}>
              <div style={{ width: "100%", height: "100%", background: C.green }} />
            </div>
          </div>

          {/* Encabezado de extracción */}
          <div style={{
            marginTop: 20, marginBottom: 2,
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
          }}>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textFaint, letterSpacing: 2, textTransform: "uppercase" }}>
              Extracción
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textFaint, letterSpacing: 1.2 }}>
              47 transacciones
            </div>
          </div>

          {/* Lista de transacciones */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {txns.map((t, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", padding: "11px 2px",
                borderBottom: i < txns.length - 1 ? `0.5px solid ${C.divider}` : "none",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, color: C.text, fontWeight: 500 }}>{t.n}</div>
                  <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{t.cat}</div>
                </div>
                <div style={{
                  fontFamily: F.sans, fontSize: 13.5, fontWeight: 500,
                  fontVariantNumeric: "tabular-nums",
                  color: t.ingreso ? C.green : C.text,
                }}>
                  {t.ingreso ? "+" : "−"}${Math.abs(t.a).toLocaleString("en-US")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Pie>
        <LaniNote pose="happy">Listo. Revisé 47 movimientos y los categoricé por ti.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>Continuar</BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 3: Categorías (toggle list iOS-style) ───────────────
function FilaCategoria({ cat, activa, onToggle, puedeDesactivar, esUltima }: {
  cat: typeof CATEGORIAS[0]; activa: boolean;
  onToggle: () => void; puedeDesactivar: boolean; esUltima: boolean;
}) {
  return (
    <button
      onClick={() => { if (activa && !puedeDesactivar) return; onToggle(); }}
      style={{
        width: "100%", background: "transparent", border: "none",
        padding: "14px 16px", cursor: "pointer", fontFamily: F.sans,
        display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        borderBottom: esUltima ? "none" : `0.5px solid ${C.divider}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.text, letterSpacing: -0.1 }}>
          {cat.nombre}
        </div>
        <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 2 }}>
          {cat.desc}
        </div>
      </div>
      {/* Toggle iOS-style */}
      <div style={{
        width: 36, height: 22, borderRadius: 99,
        background: activa ? C.text : "rgba(14,14,16,0.12)",
        position: "relative", flexShrink: 0,
        transition: "background 200ms ease",
      }}>
        <div style={{
          position: "absolute", top: 2, left: activa ? 16 : 2,
          width: 18, height: 18, borderRadius: 99,
          background: "#FFF",
          boxShadow: "0 1px 2px rgba(14,14,16,0.15)",
          transition: "left 220ms cubic-bezier(0.2,0.9,0.3,1)",
        }} />
      </div>
    </button>
  );
}

function Paso3({ onSiguiente, onSaltar, seleccionadas, setSeleccionadas, guardando }: {
  onSiguiente: () => void; onSaltar: () => void;
  seleccionadas: Set<string>; setSeleccionadas: (s: Set<string>) => void;
  guardando: boolean;
}) {
  const cantidad = seleccionadas.size;
  const toggle = (id: string) => {
    haptico.seleccion();
    const s = new Set(seleccionadas);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSeleccionadas(s);
  };

  return (
    <Chrome paso={2} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 03 · Categorías</Eyebrow>
          <Titulo>Elige tus<br />categorías.</Titulo>
          <Descripcion>
            Activa las que aplican a tu vida. Puedes cambiarlas después.
          </Descripcion>
        </div>

        <div style={{ padding: "20px 20px 0", flex: 1, overflowY: "auto" }}>
          <div style={{
            background: C.surface, borderRadius: 16,
            border: `0.5px solid ${C.line}`, overflow: "hidden",
            boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            {CATEGORIAS.map((cat, i) => (
              <FilaCategoria
                key={cat.id}
                cat={cat}
                activa={seleccionadas.has(cat.id)}
                onToggle={() => toggle(cat.id)}
                puedeDesactivar={cantidad > 1}
                esUltima={i === CATEGORIAS.length - 1}
              />
            ))}
          </div>

          <div style={{
            marginTop: 14, padding: "0 4px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontFamily: F.mono, fontSize: 10.5, color: C.textFaint, letterSpacing: 1.5 }}>
              {cantidad} / 10 activas
            </div>
            {cantidad === 1 && (
              <div style={{ fontSize: 11, color: C.amber, fontStyle: "italic", fontFamily: F.display }}>
                mínimo una
              </div>
            )}
          </div>
        </div>
      </div>

      <Pie>
        <LaniNote pose="hi">Usaré solo estas para agrupar tus gastos.</LaniNote>
        <BotonPrimario onClick={onSiguiente} cargando={guardando}>Continuar</BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 4: Presupuestos + Meta ──────────────────────────────
function BarraPresupuesto({ pct, tono }: { pct: number; tono: "ok" | "warn" | "over" }) {
  const colores = { ok: C.text, warn: C.amber, over: C.red };
  return (
    <div style={{ height: 2.5, background: "rgba(14,14,16,0.06)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${Math.min(pct, 100)}%`,
        background: colores[tono], borderRadius: 99,
      }} />
    </div>
  );
}

function TarjetaPresupuesto({ nombre, gastado, limite, pct, tono, excedido }: {
  nombre: string; gastado: number; limite: number;
  pct: number; tono: "ok" | "warn" | "over"; excedido?: boolean;
}) {
  return (
    <div style={{
      background: C.surface, borderRadius: 14, border: `0.5px solid ${C.line}`,
      padding: "14px", boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text }}>{nombre}</div>
          {excedido && (
            <div style={{
              fontFamily: F.mono, fontSize: 9, letterSpacing: 1.2,
              color: C.red, background: "rgba(217,74,74,0.1)",
              padding: "2px 5px", borderRadius: 3, fontWeight: 500,
            }}>EXCEDIDO</div>
          )}
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 13, fontVariantNumeric: "tabular-nums", letterSpacing: -0.1 }}>
          <span style={{ color: C.text, fontWeight: 500 }}>${gastado.toLocaleString("en-US")}</span>
          <span style={{ color: C.textFaint }}> / ${limite.toLocaleString("en-US")}</span>
        </div>
      </div>
      <BarraPresupuesto pct={pct} tono={tono} />
      <div style={{ marginTop: 6, fontFamily: F.mono, fontSize: 10, color: C.textFaint, letterSpacing: 0.5 }}>
        {Math.round(pct)}% usado
      </div>
    </div>
  );
}

function AnilloMeta({ pct = 42 }: { pct?: number }) {
  const size = 84, stroke = 6;
  const r = (size - stroke) / 2;
  const C2 = 2 * Math.PI * r;
  const dash = C2 * (pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(14,14,16,0.08)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={C.gold} strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={`${dash} ${C2}`} />
    </svg>
  );
}

function TarjetaMeta() {
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: C.text, borderRadius: 18, padding: "18px", color: "#fff",
    }}>
      <div style={{
        position: "absolute", top: -60, right: -60,
        width: 200, height: 200, borderRadius: 99,
        background: "radial-gradient(circle, rgba(228,185,74,0.25), transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{
            fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.8,
            color: C.gold, textTransform: "uppercase", fontWeight: 500, marginBottom: 6,
          }}>Meta de ahorro</div>
          <div style={{
            fontFamily: F.display, fontSize: 24, lineHeight: 1.05,
            letterSpacing: -0.8, fontWeight: 300, fontStyle: "italic", color: "#fff",
          }}>Vacaciones Europa</div>
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.2,
          color: "rgba(255,255,255,0.5)", textAlign: "right", lineHeight: 1.4,
        }}>Jun<br />2026</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 84, height: 84, flexShrink: 0 }}>
          <AnilloMeta pct={42} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F.display, fontSize: 22, fontWeight: 300,
            color: C.gold, letterSpacing: -0.5, fontVariantNumeric: "tabular-nums",
          }}>
            42<span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>%</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: F.display, fontSize: 26, lineHeight: 1,
            fontWeight: 300, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: -1,
          }}>$21,000</div>
          <div style={{ fontFamily: F.mono, fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
            de $50,000 meta
          </div>
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: "0.5px solid rgba(255,255,255,0.12)",
            fontSize: 11.5, color: "rgba(255,255,255,0.7)", letterSpacing: -0.05,
          }}>
            <span style={{ color: C.gold, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>$1,450</span> al mes para llegar
          </div>
        </div>
      </div>
    </div>
  );
}

function Paso4({ onSiguiente, onSaltar }: { onSiguiente: () => void; onSaltar: () => void }) {
  return (
    <Chrome paso={3} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 04 · Presupuestos</Eyebrow>
          <Titulo>Límites y<br />metas.</Titulo>
          <Descripcion>
            Define un límite por categoría y una meta de ahorro. Te aviso cuando te acerques.
          </Descripcion>
        </div>

        <div style={{ padding: "22px 20px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          <TarjetaMeta />
          <div>
            <div style={{
              fontFamily: F.mono, fontSize: 10, color: C.textFaint,
              letterSpacing: 2, textTransform: "uppercase",
              padding: "0 2px 10px",
              display: "flex", justifyContent: "space-between",
            }}>
              <span>Presupuestos</span><span>Abril</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <TarjetaPresupuesto nombre="Comida"          gastado={1800} limite={3000} pct={60}  tono="ok" />
              <TarjetaPresupuesto nombre="Transporte"      gastado={2200} limite={2500} pct={88}  tono="warn" />
              <TarjetaPresupuesto nombre="Entretenimiento" gastado={1100} limite={800}  pct={100} tono="over" excedido />
            </div>
          </div>
        </div>
      </div>

      <Pie>
        <LaniNote pose="shy">Vas bien, pero te avisaré si te pasas del límite.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>Continuar</BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 5: Dashboard preview ────────────────────────────────
function Paso5({ onFinalizar, onSaltar, nombre }: {
  onFinalizar: () => void; onSaltar: () => void; nombre: string;
}) {
  return (
    <Chrome paso={4} onSaltar={onSaltar} esUltimo>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 05 · Listo</Eyebrow>
          <Titulo>Todo en un<br />vistazo.</Titulo>
          <Descripcion>
            Balance, proyección, suscripciones olvidadas y análisis semanal.
          </Descripcion>
        </div>

        <div style={{ padding: "22px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Tarjeta de balance */}
          <div style={{
            background: C.surface, borderRadius: 18, border: `0.5px solid ${C.line}`,
            padding: "18px", boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.textFaint, textTransform: "uppercase" }}>
                Balance · Abril
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textFaint, letterSpacing: 0.5 }}>MXN</div>
            </div>
            <div style={{
              fontFamily: F.display, fontSize: 46, lineHeight: 1.05,
              color: C.text, fontVariantNumeric: "tabular-nums",
              letterSpacing: -2, marginTop: 10, fontWeight: 300,
            }}>$14,230</div>
            <div style={{
              marginTop: 14, paddingTop: 14,
              borderTop: `0.5px solid ${C.divider}`,
              display: "flex", gap: 24,
              fontFamily: F.sans, fontSize: 12.5, fontVariantNumeric: "tabular-nums",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: C.textFaint, fontSize: 10, letterSpacing: 1.5, fontFamily: F.mono, marginBottom: 4 }}>INGRESOS</div>
                <div style={{ color: C.green, fontWeight: 500 }}>+$22,000</div>
              </div>
              <div style={{ width: 0.5, background: C.divider }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: C.textFaint, fontSize: 10, letterSpacing: 1.5, fontFamily: F.mono, marginBottom: 4 }}>GASTOS</div>
                <div style={{ color: C.red, fontWeight: 500 }}>−$7,770</div>
              </div>
            </div>
          </div>

          {/* Proyección */}
          <div style={{
            background: C.surface, borderRadius: 14, border: `0.5px solid ${C.line}`,
            padding: "13px 16px", boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.5, color: C.textFaint, textTransform: "uppercase", marginBottom: 3 }}>
                Proyección · 30 abr
              </div>
              <div style={{ fontSize: 15, color: C.text, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: -0.3 }}>
                ~$11,400
              </div>
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.textFaint, textAlign: "right", letterSpacing: 0.8, lineHeight: 1.6 }}>
              18 días<br />restantes
            </div>
          </div>

          {/* Insight de Lani */}
          <div style={{
            background: C.surface, border: `0.5px solid ${C.line}`,
            borderRadius: 14, padding: "14px 14px 14px 12px",
            display: "flex", gap: 12, alignItems: "flex-start",
            boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            <LaniCircle size={48} pose="shy" ring={false} />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.5,
                color: C.accent, textTransform: "uppercase", marginBottom: 4, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: 99, background: C.accent }} />
                Lani revisó tu mes
              </div>
              <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.45, letterSpacing: -0.1 }}>
                Tus suscripciones suman{" "}
                <span style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>$1,200/mes</span>
                . Vale la pena revisar cuáles usas.
              </div>
            </div>
          </div>
        </div>
      </div>

      <Pie>
        <LaniNote pose="wave">Todo tuyo{nombre ? `, ${nombre}` : ""}. Pregúntame lo que sea.</LaniNote>
        <BotonPrimario onClick={onFinalizar}>
          {nombre ? `Entrar, ${nombre}` : "Entrar al dashboard"}
        </BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function BienvenidaPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(
    new Set(CATEGORIAS.map((c) => c.id))
  );

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const n = user.user_metadata?.nombre_completo || "";
      setNombre(n.split(" ")[0] || "");
    })();
  }, [router]);

  const guardarCategorias = async () => {
    const cats = Array.from(seleccionadas);
    localStorage.setItem("lani_categorias", JSON.stringify(cats));
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { categorias_activas: cats } });
    } catch { /* no bloqueamos */ }
  };

  const siguiente = async () => {
    haptico.ligero();
    if (paso === PASO_CATEGORIAS) {
      setGuardando(true);
      await guardarCategorias();
      setGuardando(false);
    }
    if (paso < TOTAL_PASOS - 1) {
      setPaso((p) => p + 1);
    } else {
      haptico.exito();
      localStorage.setItem("lani_onboarding_done", "1");
      router.replace("/dashboard");
    }
  };

  const saltar = () => {
    localStorage.setItem("lani_onboarding_done", "1");
    router.replace("/dashboard");
  };

  if (paso === 0) return <Paso1 onSiguiente={siguiente} onSaltar={saltar} nombre={nombre} />;
  if (paso === 1) return <Paso2 onSiguiente={siguiente} onSaltar={saltar} />;
  if (paso === 2) return (
    <Paso3
      onSiguiente={siguiente} onSaltar={saltar}
      seleccionadas={seleccionadas} setSeleccionadas={setSeleccionadas}
      guardando={guardando}
    />
  );
  if (paso === 3) return <Paso4 onSiguiente={siguiente} onSaltar={saltar} />;
  return <Paso5 onFinalizar={siguiente} onSaltar={saltar} nombre={nombre} />;
}
