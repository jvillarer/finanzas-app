"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { haptico } from "@/lib/haptics";

// ─── Tokens de diseño ─────────────────────────────────────────
const C = {
  bg:         "#F5F3EE",
  surface:    "#FFFFFF",
  surface2:   "#FBFAF6",
  line:       "rgba(14,14,16,0.08)",
  divider:    "rgba(14,14,16,0.06)",
  text:       "#0E0E10",
  textDim:    "rgba(14,14,16,0.56)",
  textFaint:  "rgba(14,14,16,0.38)",
  accent:     "#2F8F87",
  accentSoft: "rgba(47,143,135,0.10)",
  accentLine: "rgba(47,143,135,0.24)",
  gold:       "#E4B94A",
  green:      "#1F9D55",
  red:        "#D94A4A",
  amber:      "#D08B2C",
};

const F = {
  sans:    "var(--font-sans), -apple-system, system-ui, sans-serif",
  display: "var(--font-display), 'Times New Roman', serif",
  mono:    "var(--font-mono), ui-monospace, monospace",
};

// ─── Datos de catálogos ───────────────────────────────────────
const CATEGORIAS = [
  { id: "comida",     nombre: "Comida",          desc: "Restaurantes, tacos, cafés" },
  { id: "super",      nombre: "Supermercado",    desc: "Walmart, Soriana, despensa" },
  { id: "transporte", nombre: "Transporte",      desc: "Uber, gasolina, taxi" },
  { id: "entret",     nombre: "Entretenimiento", desc: "Cine, Spotify, Netflix" },
  { id: "salud",      nombre: "Salud",           desc: "Médico, farmacia, gym" },
  { id: "servicios",  nombre: "Servicios",       desc: "Luz, agua, internet" },
  { id: "ropa",       nombre: "Ropa",            desc: "Vestuario, accesorios" },
  { id: "hogar",      nombre: "Hogar",           desc: "Muebles, limpieza" },
  { id: "educacion",  nombre: "Educación",       desc: "Libros, cursos, colegiatura" },
  { id: "otros",      nombre: "Otros",           desc: "Cualquier otro gasto" },
];

const BANCOS = [
  { id: "bbva",       nombre: "BBVA" },
  { id: "citi",       nombre: "Citibanamex" },
  { id: "santander",  nombre: "Santander" },
  { id: "banorte",    nombre: "Banorte" },
  { id: "hsbc",       nombre: "HSBC" },
  { id: "hey",        nombre: "Hey Banco" },
  { id: "nu",         nombre: "Nu" },
  { id: "scotiabank", nombre: "Scotiabank" },
  { id: "amex",       nombre: "Amex" },
  { id: "liverpool",  nombre: "Liverpool" },
  { id: "palacio",    nombre: "El Palacio" },
  { id: "otro",       nombre: "Otro" },
];

const TIPOS_DEUDA = [
  { id: "tarjeta",  nombre: "Tarjeta de crédito", desc: "Saldo pendiente por pagar" },
  { id: "auto",     nombre: "Crédito de auto",    desc: "Mensualidad fija" },
  { id: "hipoteca", nombre: "Hipoteca",           desc: "Crédito de vivienda" },
  { id: "personal", nombre: "Crédito personal",   desc: "Préstamo bancario o fintech" },
  { id: "familiar", nombre: "Préstamo familiar",  desc: "Con familiar o amigo" },
];

const GASTOS_FIJOS_LISTA = [
  { id: "renta",     nombre: "Renta / Hipoteca",   desc: "Pago mensual de vivienda" },
  { id: "luz",       nombre: "Luz (CFE)",           desc: "Bimestral o mensual" },
  { id: "agua",      nombre: "Agua",               desc: "Servicio municipal" },
  { id: "internet",  nombre: "Internet",           desc: "Telmex, Izzi, Megacable..." },
  { id: "celular",   nombre: "Celular",            desc: "Plan mensual" },
  { id: "streaming", nombre: "Streaming",          desc: "Netflix, Disney+, Spotify..." },
  { id: "gym",       nombre: "Gym / Sport",        desc: "Membresía mensual" },
  { id: "seguro",    nombre: "Seguro",             desc: "Auto, vida, gastos médicos" },
  { id: "colegio",   nombre: "Colegio / Guardería",desc: "Mensualidad educativa" },
];

// ─── Tipos ────────────────────────────────────────────────────
type Frecuencia      = "quincenal" | "mensual" | "semanal";
type PeriodoRevision = "diario" | "semanal" | "quincenal" | "mensual";

// ─── Constantes de flujo ──────────────────────────────────────
const TOTAL_PASOS    = 11;
const PASO_CATEGORIAS = 4; // índice donde se guardan categorías en el flujo

// ─── Primitivos de UI ─────────────────────────────────────────

function ProgressDots({ paso }: { paso: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {Array.from({ length: TOTAL_PASOS }).map((_, i) => {
        const activo = i === paso;
        const listo  = i < paso;
        return (
          <div key={i} style={{
            height: 3,
            width: activo ? 18 : 7,
            borderRadius: 99,
            background: activo
              ? C.text
              : listo
              ? "rgba(14,14,16,0.38)"
              : "rgba(14,14,16,0.10)",
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
  size?: number; pose?: "hi" | "wave" | "happy" | "shy";
  ring?: boolean; ringColor?: string;
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

// FilaToggle — fila de toggle reutilizable (gastos fijos, deudas, categorías)
function FilaToggle({ nombre, desc, activo, onToggle, esUltima }: {
  nombre: string; desc: string; activo: boolean;
  onToggle: () => void; esUltima: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: "100%", background: "transparent", border: "none",
        padding: "14px 16px", cursor: "pointer", fontFamily: F.sans,
        display: "flex", alignItems: "center", gap: 12, textAlign: "left",
        borderBottom: esUltima ? "none" : `0.5px solid ${C.divider}`,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.text, letterSpacing: -0.1 }}>
          {nombre}
        </div>
        <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 2 }}>
          {desc}
        </div>
      </div>
      <div style={{
        width: 36, height: 22, borderRadius: 99,
        background: activo ? C.text : "rgba(14,14,16,0.12)",
        position: "relative", flexShrink: 0,
        transition: "background 200ms ease",
      }}>
        <div style={{
          position: "absolute", top: 2, left: activo ? 16 : 2,
          width: 18, height: 18, borderRadius: 99,
          background: "#FFF",
          boxShadow: "0 1px 2px rgba(14,14,16,0.15)",
          transition: "left 220ms cubic-bezier(0.2,0.9,0.3,1)",
        }} />
      </div>
    </button>
  );
}

// ─── Utilidad: formatear entrada numérica con comas ───────────
function formatearNumero(valor: string): string {
  const limpio = valor.replace(/[^0-9]/g, "");
  const num = parseInt(limpio, 10);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-US");
}

// ─── Paso 01: Bienvenida / Console hero ───────────────────────
function Paso1({ onSiguiente, onSaltar, nombre }: {
  onSiguiente: () => void; onSaltar: () => void; nombre: string;
}) {
  const textoCompleto = "Puedo leer tu estado de cuenta, categorizar cada movimiento y decirte a dónde se va tu dinero — antes de que te preguntes.";
  const [escrito, setEscrito] = useState(0);

  useEffect(() => {
    if (escrito >= textoCompleto.length) return;
    const t = setTimeout(() => setEscrito((n) => n + 2), 24);
    return () => clearTimeout(t);
  }, [escrito, textoCompleto.length]);

  return (
    <Chrome paso={0} onSaltar={onSaltar} esUltimo={false}>
      <style>{`
        @keyframes lani-spin   { to { transform: rotate(360deg); } }
        @keyframes lani-pulse  { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes lani-cursor { 0%,49%  { opacity:1; } 50%,100% { opacity:0; } }
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
            animation: "lani-pulse 2s infinite", display: "inline-block",
          }} />
          <span>Asistente · Sesión iniciada</span>
          <span style={{ flex: 1, height: 0.5, background: C.line, display: "inline-block" }} />
          <span style={{ fontVariantNumeric: "tabular-nums" }}>00:00:04</span>
        </div>

        {/* Tarjeta principal */}
        <div style={{
          background: C.surface, border: `0.5px solid ${C.line}`,
          borderRadius: 16, boxShadow: "0 1px 2px rgba(14,14,16,0.03)", overflow: "hidden",
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

        {/* Teaser */}
        <div style={{
          marginTop: 14, display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          background: C.accentSoft, border: `0.5px solid ${C.accentLine}`, borderRadius: 12,
        }}>
          <div style={{
            fontFamily: F.mono, fontSize: 9, letterSpacing: 1.4,
            color: C.accent, fontWeight: 500, textTransform: "uppercase",
          }}>Próximo</div>
          <div style={{ flex: 1, fontSize: 12.5, color: C.textDim, letterSpacing: -0.05 }}>
            5 min · 10 preguntas para conocerte
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

// ─── Paso 02: Perfil de ingresos ──────────────────────────────
function PasoIngresos({ onSiguiente, onSaltar, frecuencia, setFrecuencia, monto, setMonto }: {
  onSiguiente: () => void; onSaltar: () => void;
  frecuencia: Frecuencia; setFrecuencia: (f: Frecuencia) => void;
  monto: string; setMonto: (m: string) => void;
}) {
  const opciones: { id: Frecuencia; label: string; sub: string }[] = [
    { id: "quincenal", label: "Quincenal", sub: "2 veces/mes" },
    { id: "mensual",   label: "Mensual",   sub: "1 vez/mes" },
    { id: "semanal",   label: "Semanal",   sub: "4 veces/mes" },
  ];

  const montoNum = parseFloat(monto.replace(/,/g, "")) || 0;
  const proyeccionMes =
    frecuencia === "quincenal" ? montoNum * 2 :
    frecuencia === "semanal"   ? Math.round(montoNum * 4.3) :
    montoNum;

  return (
    <Chrome paso={1} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 02 · Ingresos</Eyebrow>
          <Titulo>¿Cuánto y cuándo<br />cobras?</Titulo>
          <Descripcion>
            Con esto proyecto tu quincena con precisión y calculo cuánto te sobra real.
          </Descripcion>
        </div>

        <div style={{ padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Frecuencia */}
          <div>
            <div style={{
              fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.textFaint,
              textTransform: "uppercase", marginBottom: 10, padding: "0 2px",
            }}>Frecuencia de cobro</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {opciones.map(op => (
                <button
                  key={op.id}
                  onClick={() => { haptico.seleccion(); setFrecuencia(op.id); }}
                  style={{
                    padding: "13px 8px", borderRadius: 12, border: "none",
                    background: frecuencia === op.id ? C.text : C.surface,
                    boxShadow: `inset 0 0 0 0.5px ${frecuencia === op.id ? "transparent" : C.line}`,
                    cursor: "pointer", textAlign: "center", fontFamily: F.sans,
                    transition: "background 200ms ease",
                  }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: 600, letterSpacing: -0.2,
                    color: frecuencia === op.id ? "#FFF" : C.text,
                  }}>{op.label}</div>
                  <div style={{
                    fontSize: 10.5, marginTop: 3, fontFamily: F.mono, letterSpacing: 0.4,
                    color: frecuencia === op.id ? "rgba(255,255,255,0.6)" : C.textFaint,
                  }}>{op.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div>
            <div style={{
              fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.textFaint,
              textTransform: "uppercase", marginBottom: 10, padding: "0 2px",
            }}>
              Monto neto ({frecuencia === "quincenal" ? "por quincena" : frecuencia === "semanal" ? "por semana" : "por mes"})
            </div>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                fontFamily: F.sans, fontSize: 20, fontWeight: 500,
                color: C.textFaint, pointerEvents: "none",
              }}>$</div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={monto}
                onChange={e => setMonto(formatearNumero(e.target.value))}
                style={{
                  width: "100%", height: 58, borderRadius: 14,
                  border: `0.5px solid ${C.line}`, background: C.surface,
                  color: C.text, fontFamily: F.sans, fontSize: 24, fontWeight: 500,
                  padding: "0 16px 0 32px", outline: "none",
                  letterSpacing: -0.6, boxSizing: "border-box",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
          </div>

          {/* Proyección calculada */}
          {montoNum > 0 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 16px",
              background: C.accentSoft, border: `0.5px solid ${C.accentLine}`, borderRadius: 12,
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: 10, letterSpacing: 1.5,
                color: C.accent, textTransform: "uppercase",
              }}>Ingreso mensual estimado</div>
              <div style={{
                fontFamily: F.sans, fontSize: 16, fontWeight: 600,
                color: C.text, fontVariantNumeric: "tabular-nums", letterSpacing: -0.4,
              }}>
                ${proyeccionMes.toLocaleString("en-US")}
              </div>
            </div>
          )}
        </div>
      </div>

      <Pie>
        <LaniNote pose="hi">Usaré esto para personalizar tus proyecciones y alertas.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>
          {montoNum === 0 ? "Omitir por ahora" : "Continuar"}
        </BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 03: Cuentas y tarjetas ──────────────────────────────
function PasoCuentas({ onSiguiente, onSaltar, seleccionadas, setSeleccionadas }: {
  onSiguiente: () => void; onSaltar: () => void;
  seleccionadas: Set<string>; setSeleccionadas: (s: Set<string>) => void;
}) {
  const toggle = (id: string) => {
    haptico.seleccion();
    const s = new Set(seleccionadas);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSeleccionadas(s);
  };

  return (
    <Chrome paso={2} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 03 · Cuentas</Eyebrow>
          <Titulo>¿Qué cuentas<br />tienes?</Titulo>
          <Descripcion>
            Selecciona tus bancos y tarjetas. Solo para contexto — sin acceso real.
          </Descripcion>
        </div>

        <div style={{ padding: "24px 20px 0" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {BANCOS.map(b => {
              const activo = seleccionadas.has(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => toggle(b.id)}
                  style={{
                    padding: "9px 16px", borderRadius: 99, border: "none",
                    background: activo ? C.text : C.surface,
                    boxShadow: `inset 0 0 0 0.5px ${activo ? "transparent" : C.line}`,
                    color: activo ? "#FFF" : C.text,
                    fontFamily: F.sans, fontSize: 13.5,
                    fontWeight: activo ? 600 : 400, letterSpacing: -0.2,
                    cursor: "pointer", transition: "all 200ms ease",
                  }}
                >{b.nombre}</button>
              );
            })}
          </div>

          {seleccionadas.size > 0 && (
            <div style={{
              marginTop: 20, padding: "12px 16px",
              background: C.surface, border: `0.5px solid ${C.line}`,
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: 10, letterSpacing: 1.5,
                color: C.textFaint, textTransform: "uppercase",
              }}>Seleccionadas</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>
                {seleccionadas.size} {seleccionadas.size === 1 ? "cuenta" : "cuentas"}
              </div>
            </div>
          )}
        </div>
      </div>

      <Pie>
        <LaniNote pose="happy">Con esto entiendo cuántas fuentes de gasto manejas.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>
          {seleccionadas.size === 0 ? "Omitir" : "Continuar"}
        </BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 04: Importa tu banco ────────────────────────────────
function PasoImportar({ onSiguiente, onSaltar }: {
  onSiguiente: () => void; onSaltar: () => void;
}) {
  const txns = [
    { n: "Uber",    cat: "Transporte",      a: -280 },
    { n: "Netflix", cat: "Entretenimiento", a: -219 },
    { n: "Nómina",  cat: "Ingreso",         a: 18000, ingreso: true },
    { n: "CFE",     cat: "Servicios",       a: -640 },
  ];

  return (
    <Chrome paso={3} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 04 · Importación</Eyebrow>
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

// ─── Paso 05: Categorías (toggle list iOS-style) ──────────────
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
        <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 2 }}>{cat.desc}</div>
      </div>
      <div style={{
        width: 36, height: 22, borderRadius: 99,
        background: activa ? C.text : "rgba(14,14,16,0.12)",
        position: "relative", flexShrink: 0,
        transition: "background 200ms ease",
      }}>
        <div style={{
          position: "absolute", top: 2, left: activa ? 16 : 2,
          width: 18, height: 18, borderRadius: 99, background: "#FFF",
          boxShadow: "0 1px 2px rgba(14,14,16,0.15)",
          transition: "left 220ms cubic-bezier(0.2,0.9,0.3,1)",
        }} />
      </div>
    </button>
  );
}

function PasoCategoriasStep({ onSiguiente, onSaltar, seleccionadas, setSeleccionadas, guardando }: {
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
    <Chrome paso={4} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 05 · Categorías</Eyebrow>
          <Titulo>Elige tus<br />categorías.</Titulo>
          <Descripcion>Activa las que aplican a tu vida. Puedes cambiarlas después.</Descripcion>
        </div>

        <div style={{ padding: "20px 20px 0", flex: 1, overflowY: "auto" }}>
          <div style={{
            background: C.surface, borderRadius: 16,
            border: `0.5px solid ${C.line}`, overflow: "hidden",
            boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            {CATEGORIAS.map((cat, i) => (
              <FilaCategoria
                key={cat.id} cat={cat}
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

// ─── Paso 06: Gastos fijos ────────────────────────────────────
function PasoGastosFijos({ onSiguiente, onSaltar, seleccionados, setSeleccionados }: {
  onSiguiente: () => void; onSaltar: () => void;
  seleccionados: Set<string>; setSeleccionados: (s: Set<string>) => void;
}) {
  const toggle = (id: string) => {
    haptico.seleccion();
    const s = new Set(seleccionados);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSeleccionados(s);
  };

  return (
    <Chrome paso={5} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 06 · Gastos fijos</Eyebrow>
          <Titulo>¿Cuáles son tus<br />gastos fijos?</Titulo>
          <Descripcion>
            Los que salen sin falta cada mes. Los rastreo aparte de tus gastos variables.
          </Descripcion>
        </div>

        <div style={{ padding: "20px 20px 0", flex: 1, overflowY: "auto" }}>
          <div style={{
            background: C.surface, borderRadius: 16,
            border: `0.5px solid ${C.line}`, overflow: "hidden",
            boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            {GASTOS_FIJOS_LISTA.map((g, i) => (
              <FilaToggle
                key={g.id} nombre={g.nombre} desc={g.desc}
                activo={seleccionados.has(g.id)}
                onToggle={() => toggle(g.id)}
                esUltima={i === GASTOS_FIJOS_LISTA.length - 1}
              />
            ))}
          </div>
          <div style={{
            marginTop: 12, padding: "0 4px",
            fontFamily: F.mono, fontSize: 10.5, color: C.textFaint, letterSpacing: 1.2,
          }}>
            {seleccionados.size > 0
              ? `${seleccionados.size} gasto${seleccionados.size > 1 ? "s" : ""} seleccionado${seleccionados.size > 1 ? "s" : ""}`
              : "Ninguno seleccionado"}
          </div>
        </div>
      </div>

      <Pie>
        <LaniNote pose="hi">Los separo de tus gastos variables para un análisis más claro.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>
          {seleccionados.size === 0 ? "No tengo fijos" : "Continuar"}
        </BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 07: Deudas activas ──────────────────────────────────
function PasoDeudas({ onSiguiente, onSaltar, seleccionadas, setSeleccionadas }: {
  onSiguiente: () => void; onSaltar: () => void;
  seleccionadas: Set<string>; setSeleccionadas: (s: Set<string>) => void;
}) {
  const toggle = (id: string) => {
    haptico.seleccion();
    const s = new Set(seleccionadas);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSeleccionadas(s);
  };

  return (
    <Chrome paso={6} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 07 · Deudas</Eyebrow>
          <Titulo>¿Tienes deudas<br />activas?</Titulo>
          <Descripcion>
            Sin montos por ahora, solo para que las considere al analizar tu situación.
          </Descripcion>
        </div>

        <div style={{ padding: "20px 20px 0" }}>
          <div style={{
            background: C.surface, borderRadius: 16,
            border: `0.5px solid ${C.line}`, overflow: "hidden",
            boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            {TIPOS_DEUDA.map((d, i) => (
              <FilaToggle
                key={d.id} nombre={d.nombre} desc={d.desc}
                activo={seleccionadas.has(d.id)}
                onToggle={() => toggle(d.id)}
                esUltima={i === TIPOS_DEUDA.length - 1}
              />
            ))}
          </div>

          {seleccionadas.size > 0 && (
            <div style={{
              marginTop: 14, padding: "12px 16px",
              background: "rgba(217,74,74,0.06)",
              border: "0.5px solid rgba(217,74,74,0.16)",
              borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: 10, letterSpacing: 1.2,
                color: C.red, textTransform: "uppercase", flexShrink: 0, paddingTop: 1,
              }}>Nota</div>
              <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.45 }}>
                Las consideraré al calcular tu balance real y al darte consejos de ahorro.
              </div>
            </div>
          )}
        </div>
      </div>

      <Pie>
        <LaniNote pose="shy">No te juzgo. Solo necesito el contexto para darte buenos consejos.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>
          {seleccionadas.size === 0 ? "No tengo deudas" : "Continuar"}
        </BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 08: Meta de ahorro (interactiva) ────────────────────
function AnilloMeta({ pct = 0 }: { pct?: number }) {
  const size = 80, stroke = 5;
  const r = (size - stroke) / 2;
  const circunferencia = 2 * Math.PI * r;
  const dash = circunferencia * (Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(228,185,74,0.2)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={C.gold} strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={`${dash} ${circunferencia}`} />
    </svg>
  );
}

function PasoMeta({ onSiguiente, onSaltar, nombre, setNombre, monto, setMonto, meses, setMeses, ingresoMensual }: {
  onSiguiente: () => void; onSaltar: () => void;
  nombre: string; setNombre: (n: string) => void;
  monto: string; setMonto: (m: string) => void;
  meses: number; setMeses: (m: number) => void;
  ingresoMensual: number;
}) {
  const montoNum = parseFloat(monto.replace(/,/g, "")) || 0;
  const porMes   = meses > 0 && montoNum > 0 ? Math.round(montoNum / meses) : 0;
  const pctIngreso = ingresoMensual > 0 && porMes > 0
    ? Math.round((porMes / ingresoMensual) * 100) : 0;

  const opcionesMeses = [3, 6, 12, 18, 24, 36];

  return (
    <Chrome paso={7} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 08 · Meta</Eyebrow>
          <Titulo>¿Para qué estás<br />ahorrando?</Titulo>
          <Descripcion>
            Una meta concreta hace toda la diferencia. Puedes cambiarla después.
          </Descripcion>
        </div>

        <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Nombre */}
          <div>
            <div style={{
              fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.textFaint,
              textTransform: "uppercase", marginBottom: 8,
            }}>Nombre de la meta</div>
            <input
              type="text"
              placeholder="Ej. Fondo de emergencia"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              style={{
                width: "100%", height: 50, borderRadius: 12,
                border: `0.5px solid ${C.line}`, background: C.surface,
                color: C.text, fontFamily: F.sans, fontSize: 15,
                fontWeight: 500, padding: "0 16px",
                outline: "none", letterSpacing: -0.3, boxSizing: "border-box",
              }}
            />
          </div>

          {/* Monto */}
          <div>
            <div style={{
              fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.textFaint,
              textTransform: "uppercase", marginBottom: 8,
            }}>Monto objetivo</div>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                fontFamily: F.sans, fontSize: 17, fontWeight: 500,
                color: C.textFaint, pointerEvents: "none",
              }}>$</div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={monto}
                onChange={e => setMonto(formatearNumero(e.target.value))}
                style={{
                  width: "100%", height: 50, borderRadius: 12,
                  border: `0.5px solid ${C.line}`, background: C.surface,
                  color: C.text, fontFamily: F.sans, fontSize: 20,
                  fontWeight: 500, padding: "0 16px 0 28px",
                  outline: "none", letterSpacing: -0.5, boxSizing: "border-box",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
          </div>

          {/* Plazo */}
          <div>
            <div style={{
              fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.textFaint,
              textTransform: "uppercase", marginBottom: 8,
            }}>Plazo</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {opcionesMeses.map(m => (
                <button
                  key={m}
                  onClick={() => { haptico.seleccion(); setMeses(m); }}
                  style={{
                    padding: "8px 13px", borderRadius: 99, border: "none",
                    background: meses === m ? C.text : C.surface,
                    boxShadow: `inset 0 0 0 0.5px ${meses === m ? "transparent" : C.line}`,
                    color: meses === m ? "#FFF" : C.text,
                    fontFamily: F.mono, fontSize: 11, letterSpacing: 0.5,
                    cursor: "pointer", transition: "all 200ms ease",
                  }}
                >
                  {m < 12 ? `${m}m` : `${m / 12}a`}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjeta de resultado */}
          {montoNum > 0 && (
            <div style={{
              background: C.text, borderRadius: 16, padding: "16px",
              display: "flex", alignItems: "center", gap: 16,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -50, right: -50,
                width: 160, height: 160, borderRadius: 99,
                background: "radial-gradient(circle, rgba(228,185,74,0.2), transparent 70%)",
                pointerEvents: "none",
              }} />
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: F.mono, fontSize: 9.5, letterSpacing: 1.6,
                  color: C.gold, textTransform: "uppercase", marginBottom: 4, fontWeight: 500,
                }}>
                  {nombre || "Meta"} · {meses < 12 ? `${meses} meses` : `${meses / 12} año${meses / 12 > 1 ? "s" : ""}`}
                </div>
                <div style={{
                  fontFamily: F.display, fontSize: 24, lineHeight: 1.05,
                  fontWeight: 300, color: "#fff",
                  fontVariantNumeric: "tabular-nums", letterSpacing: -0.6,
                }}>
                  ${porMes.toLocaleString("en-US")}/mes
                </div>
                {pctIngreso > 0 && (
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>
                    {pctIngreso}% de tu ingreso mensual
                  </div>
                )}
              </div>
              <AnilloMeta pct={0} />
            </div>
          )}
        </div>
      </div>

      <Pie>
        <LaniNote pose="happy">Te avisaré cada quincena cuánto llevas acumulado hacia tu meta.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>
          {montoNum === 0 ? "Omitir por ahora" : "Continuar"}
        </BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 09: Presupuestos ────────────────────────────────────
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

function PasoPresupuestos({ onSiguiente, onSaltar }: {
  onSiguiente: () => void; onSaltar: () => void;
}) {
  return (
    <Chrome paso={8} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 09 · Presupuestos</Eyebrow>
          <Titulo>Límites por<br />categoría.</Titulo>
          <Descripcion>
            Define un límite mensual por categoría. Te aviso cuando te acerques al tope.
          </Descripcion>
        </div>

        <div style={{ padding: "22px 20px 0", display: "flex", flexDirection: "column", gap: 14 }}>
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

// ─── Paso 10: Periodo de revisión ─────────────────────────────
function PasoPeriodo({ onSiguiente, onSaltar, periodo, setPeriodo }: {
  onSiguiente: () => void; onSaltar: () => void;
  periodo: PeriodoRevision; setPeriodo: (p: PeriodoRevision) => void;
}) {
  const opciones: { id: PeriodoRevision; label: string; desc: string; simbolo: string }[] = [
    { id: "diario",    label: "Diario",    desc: "Reviso mis finanzas cada día",      simbolo: "24h" },
    { id: "semanal",   label: "Semanal",   desc: "Hago el corte los lunes o viernes", simbolo: "7d"  },
    { id: "quincenal", label: "Quincenal", desc: "Cada 15 días, al cobrar",           simbolo: "15d" },
    { id: "mensual",   label: "Mensual",   desc: "Un resumen completo al mes",        simbolo: "30d" },
  ];

  return (
    <Chrome paso={9} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 10 · Revisión</Eyebrow>
          <Titulo>¿Cada cuándo<br />revisas?</Titulo>
          <Descripcion>
            Adapto mis resúmenes y alertas a tu ritmo. Puedes cambiarlo después.
          </Descripcion>
        </div>

        <div style={{ padding: "24px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {opciones.map(op => {
            const activo = periodo === op.id;
            return (
              <button
                key={op.id}
                onClick={() => { haptico.seleccion(); setPeriodo(op.id); }}
                style={{
                  width: "100%", padding: "15px 16px", borderRadius: 14, border: "none",
                  background: activo ? C.text : C.surface,
                  boxShadow: `inset 0 0 0 0.5px ${activo ? "transparent" : C.line}`,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                  textAlign: "left", fontFamily: F.sans,
                  transition: "all 200ms ease",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: activo ? "rgba(255,255,255,0.10)" : C.surface2,
                  border: activo ? "none" : `0.5px solid ${C.line}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: F.mono, fontSize: 11, letterSpacing: 0.6, flexShrink: 0,
                  color: activo ? "rgba(255,255,255,0.8)" : C.textFaint,
                }}>{op.simbolo}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 14.5, fontWeight: 600, letterSpacing: -0.2,
                    color: activo ? "#FFF" : C.text,
                  }}>{op.label}</div>
                  <div style={{
                    fontSize: 12, color: activo ? "rgba(255,255,255,0.6)" : C.textFaint,
                    marginTop: 2,
                  }}>{op.desc}</div>
                </div>
                {activo && (
                  <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
                    <path d="M3 8l3.5 3.5L13 4" stroke="#FFF" strokeWidth="1.8" fill="none"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Pie>
        <LaniNote pose="wave">Ajusto mis resúmenes y alertas a tu frecuencia.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>Continuar</BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 11: Dashboard preview ───────────────────────────────
function PasoDashboard({ onFinalizar, onSaltar, nombre, cargando }: {
  onFinalizar: () => void; onSaltar: () => void;
  nombre: string; cargando?: boolean;
}) {
  return (
    <Chrome paso={10} onSaltar={onSaltar} esUltimo>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 11 · Listo</Eyebrow>
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
        <BotonPrimario onClick={onFinalizar} cargando={cargando}>
          {nombre ? `Entrar, ${nombre}` : "Entrar al dashboard"}
        </BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Página principal ─────────────────────────────────────────
export default function BienvenidaPage() {
  const router   = useRouter();
  const [paso, setPaso]       = useState(0);
  const [nombre, setNombre]   = useState("");
  const [guardando, setGuardando] = useState(false);

  // ── Estado del onboarding ────────────────────────────────────
  // Categorías (paso 05)
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(
    new Set(CATEGORIAS.map((c) => c.id))
  );

  // Ingresos (paso 02)
  const [frecuenciaIngreso, setFrecuenciaIngreso] = useState<Frecuencia>("quincenal");
  const [montoIngreso, setMontoIngreso] = useState("");

  // Cuentas (paso 03)
  const [cuentas, setCuentas] = useState<Set<string>>(new Set());

  // Gastos fijos (paso 06)
  const [gastosFijos, setGastosFijos] = useState<Set<string>>(new Set());

  // Deudas (paso 07)
  const [deudas, setDeudas] = useState<Set<string>>(new Set());

  // Meta de ahorro (paso 08)
  const [metaNombre, setMetaNombre] = useState("Fondo de emergencia");
  const [metaMonto,  setMetaMonto]  = useState("");
  const [metaMeses,  setMetaMeses]  = useState(12);

  // Periodo de revisión (paso 10)
  const [periodoRevision, setPeriodoRevision] = useState<PeriodoRevision>("quincenal");

  // ── Carga del nombre del usuario ─────────────────────────────
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const nombreCompleto = user.user_metadata?.nombre_completo || "";
      setNombre(nombreCompleto.split(" ")[0] || "");
    })();
  }, [router]);

  // ── Ingreso mensual derivado ──────────────────────────────────
  const ingresoMensual = (() => {
    const num = parseFloat(montoIngreso.replace(/,/g, "")) || 0;
    return frecuenciaIngreso === "quincenal" ? num * 2 :
           frecuenciaIngreso === "semanal"   ? Math.round(num * 4.3) : num;
  })();

  // ── Guardar categorías (al pasar el paso 05) ──────────────────
  const guardarCategorias = async () => {
    const cats = Array.from(seleccionadas);
    localStorage.setItem("lani_categorias", JSON.stringify(cats));
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { categorias_activas: cats } });
    } catch { /* no bloqueamos */ }
  };

  // ── Guardar todo (al finalizar) ───────────────────────────────
  const guardarTodo = async () => {
    const ingresoNum  = parseFloat(montoIngreso.replace(/,/g, "")) || 0;
    const metaMontoNum = parseFloat(metaMonto.replace(/,/g, "")) || 0;
    const cats = Array.from(seleccionadas);

    // localStorage
    localStorage.setItem("lani_ingreso",           JSON.stringify({ frecuencia: frecuenciaIngreso, monto: ingresoNum }));
    localStorage.setItem("lani_cuentas",            JSON.stringify([...cuentas]));
    localStorage.setItem("lani_gastos_fijos",       JSON.stringify([...gastosFijos]));
    localStorage.setItem("lani_deudas",             JSON.stringify([...deudas]));
    localStorage.setItem("lani_meta",               JSON.stringify({ nombre: metaNombre, monto: metaMontoNum, meses: metaMeses }));
    localStorage.setItem("lani_periodo_revision",   periodoRevision);
    localStorage.setItem("lani_categorias",         JSON.stringify(cats));

    // Supabase — un solo llamado con todo el perfil
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: {
          categorias_activas: cats,
          ingreso:            { frecuencia: frecuenciaIngreso, monto: ingresoNum },
          cuentas:            [...cuentas],
          gastos_fijos:       [...gastosFijos],
          deudas:             [...deudas],
          meta_ahorro:        { nombre: metaNombre, monto: metaMontoNum, meses: metaMeses },
          periodo_revision:   periodoRevision,
        },
      });
    } catch { /* no bloqueamos */ }
  };

  // ── Navegación ────────────────────────────────────────────────
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
      setGuardando(true);
      await guardarTodo();
      setGuardando(false);
      localStorage.setItem("lani_onboarding_done", "1");
      router.replace("/dashboard");
    }
  };

  const saltar = () => {
    localStorage.setItem("lani_onboarding_done", "1");
    router.replace("/dashboard");
  };

  // ── Render ────────────────────────────────────────────────────
  if (paso === 0)  return <Paso1            onSiguiente={siguiente} onSaltar={saltar} nombre={nombre} />;
  if (paso === 1)  return <PasoIngresos     onSiguiente={siguiente} onSaltar={saltar} frecuencia={frecuenciaIngreso} setFrecuencia={setFrecuenciaIngreso} monto={montoIngreso} setMonto={setMontoIngreso} />;
  if (paso === 2)  return <PasoCuentas      onSiguiente={siguiente} onSaltar={saltar} seleccionadas={cuentas} setSeleccionadas={setCuentas} />;
  if (paso === 3)  return <PasoImportar     onSiguiente={siguiente} onSaltar={saltar} />;
  if (paso === 4)  return <PasoCategoriasStep onSiguiente={siguiente} onSaltar={saltar} seleccionadas={seleccionadas} setSeleccionadas={setSeleccionadas} guardando={guardando} />;
  if (paso === 5)  return <PasoGastosFijos  onSiguiente={siguiente} onSaltar={saltar} seleccionados={gastosFijos} setSeleccionados={setGastosFijos} />;
  if (paso === 6)  return <PasoDeudas       onSiguiente={siguiente} onSaltar={saltar} seleccionadas={deudas} setSeleccionadas={setDeudas} />;
  if (paso === 7)  return <PasoMeta         onSiguiente={siguiente} onSaltar={saltar} nombre={metaNombre} setNombre={setMetaNombre} monto={metaMonto} setMonto={setMetaMonto} meses={metaMeses} setMeses={setMetaMeses} ingresoMensual={ingresoMensual} />;
  if (paso === 8)  return <PasoPresupuestos  onSiguiente={siguiente} onSaltar={saltar} />;
  if (paso === 9)  return <PasoPeriodo      onSiguiente={siguiente} onSaltar={saltar} periodo={periodoRevision} setPeriodo={setPeriodoRevision} />;
  return                  <PasoDashboard    onFinalizar={siguiente} onSaltar={saltar} nombre={nombre} cargando={guardando} />;
}
