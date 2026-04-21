"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { haptico } from "@/lib/haptics";
import { suscribirAPush } from "@/lib/notificaciones";

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
const TOTAL_PASOS        = 11; // sin el paso de cuentas bancarias
const PASO_CATEGORIAS    = 2;  // índice donde se guardan categorías en el flujo
const PASO_WHATSAPP      = 8;  // índice del paso de WhatsApp
const PASO_NOTIFICACIONES = 9; // índice del paso de notificaciones push

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
      position: "sticky",
      bottom: 0,
      backgroundColor: C.bg,
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

// ─── Paso 04: Categorías (toggle list iOS-style) ──────────────
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
    <Chrome paso={2} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 03 · Categorías</Eyebrow>
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

// ─── Tipos y catálogos para gastos fijos ──────────────────────
type GastoOtro = { nombre: string; monto: string; periodicidad: string };

const PERIODICIDADES = [
  { id: "mensual",   label: "Mensual",   factor: 1       },
  { id: "bimestral", label: "Bimestral", factor: 0.5     },
  { id: "quincenal", label: "Quincenal", factor: 2       },
  { id: "anual",     label: "Anual",     factor: 1 / 12  },
];

// Convierte monto + periodicidad a su equivalente mensual
function aEquivalenteMensual(montoStr: string, periodicidad: string): number {
  const monto = parseFloat(montoStr.replace(/,/g, "")) || 0;
  const p = PERIODICIDADES.find(p => p.id === periodicidad);
  return monto * (p?.factor ?? 1);
}

// SubSección de monto + periodicidad (compartida entre fila predefinida y fila "otro")
function InputMontoPeriodicidad({ monto, periodicidad, onMonto, onPeriodicidad, placeholder = "Monto" }: {
  monto: string; periodicidad: string;
  onMonto: (v: string) => void; onPeriodicidad: (p: string) => void;
  placeholder?: string;
}) {
  const equiv = aEquivalenteMensual(monto, periodicidad);
  const mostrarEquiv = periodicidad !== "mensual" && equiv > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Monto */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ color: C.textFaint, fontSize: 15, fontWeight: 500, flexShrink: 0 }}>$</div>
        <input
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={monto}
          onChange={e => onMonto(formatearNumero(e.target.value))}
          style={{
            flex: 1, height: 38, borderRadius: 8,
            border: `0.5px solid ${C.line}`, background: C.surface2,
            color: C.text, fontFamily: F.sans, fontSize: 15,
            fontWeight: 500, padding: "0 12px",
            outline: "none", letterSpacing: -0.3,
            fontVariantNumeric: "tabular-nums",
            boxSizing: "border-box" as const,
          }}
        />
      </div>

      {/* Chips de periodicidad */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {PERIODICIDADES.map(p => (
          <button
            key={p.id}
            onClick={() => onPeriodicidad(p.id)}
            style={{
              padding: "5px 10px", borderRadius: 99, border: "none",
              background: periodicidad === p.id ? C.text : C.surface2,
              boxShadow: `inset 0 0 0 0.5px ${periodicidad === p.id ? "transparent" : C.line}`,
              color: periodicidad === p.id ? "#FFF" : C.textDim,
              fontFamily: F.mono, fontSize: 9.5, letterSpacing: 0.5,
              cursor: "pointer", transition: "all 150ms ease",
            }}
          >{p.label}</button>
        ))}
        {mostrarEquiv && (
          <div style={{
            marginLeft: "auto",
            fontFamily: F.mono, fontSize: 9.5, color: C.textFaint, letterSpacing: 0.4,
            fontVariantNumeric: "tabular-nums",
          }}>
            ≈ ${Math.round(equiv).toLocaleString("en-US")}/mes
          </div>
        )}
      </div>
    </div>
  );
}

// FilaToggleMonto — toggle con monto + periodicidad al activarse
function FilaToggleMonto({ nombre, desc, activo, monto, periodicidad, onToggle, onMonto, onPeriodicidad, esUltima }: {
  nombre: string; desc: string; activo: boolean;
  monto: string; periodicidad: string;
  onToggle: () => void; onMonto: (v: string) => void;
  onPeriodicidad: (p: string) => void; esUltima: boolean;
}) {
  return (
    <div style={{ borderBottom: esUltima && !activo ? "none" : `0.5px solid ${C.divider}` }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "transparent", border: "none",
          padding: "14px 16px", cursor: "pointer", fontFamily: F.sans,
          display: "flex", alignItems: "center", gap: 12, textAlign: "left",
          borderBottom: activo ? `0.5px solid ${C.divider}` : "none",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: C.text, letterSpacing: -0.1 }}>{nombre}</div>
          {!activo && <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 2 }}>{desc}</div>}
        </div>
        <div style={{
          width: 36, height: 22, borderRadius: 99,
          background: activo ? C.text : "rgba(14,14,16,0.12)",
          position: "relative", flexShrink: 0, transition: "background 200ms ease",
        }}>
          <div style={{
            position: "absolute", top: 2, left: activo ? 16 : 2,
            width: 18, height: 18, borderRadius: 99, background: "#FFF",
            boxShadow: "0 1px 2px rgba(14,14,16,0.15)",
            transition: "left 220ms cubic-bezier(0.2,0.9,0.3,1)",
          }} />
        </div>
      </button>

      {activo && (
        <div style={{ padding: "10px 16px 14px" }}>
          <InputMontoPeriodicidad
            monto={monto} periodicidad={periodicidad}
            onMonto={onMonto} onPeriodicidad={onPeriodicidad}
            placeholder="Monto del pago"
          />
        </div>
      )}
    </div>
  );
}

// FilaOtro — gasto personalizado con nombre + monto + periodicidad
function FilaOtro({ index, nombre, monto, periodicidad, onNombre, onMonto, onPeriodicidad, onEliminar }: {
  index: number; nombre: string; monto: string; periodicidad: string;
  onNombre: (v: string) => void; onMonto: (v: string) => void;
  onPeriodicidad: (p: string) => void; onEliminar: () => void;
}) {
  return (
    <div style={{
      padding: "12px 16px 14px",
      borderTop: `0.5px solid ${C.divider}`,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          placeholder={`Otro gasto ${index + 1}`}
          value={nombre}
          onChange={e => onNombre(e.target.value)}
          style={{
            flex: 1, height: 36, borderRadius: 8,
            border: `0.5px solid ${C.line}`, background: C.surface2,
            color: C.text, fontFamily: F.sans, fontSize: 13.5,
            fontWeight: 500, padding: "0 12px",
            outline: "none", letterSpacing: -0.2,
            boxSizing: "border-box" as const,
          }}
        />
        <button
          onClick={onEliminar}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.textFaint, padding: "4px 6px", fontSize: 18,
            lineHeight: 1, borderRadius: 6, flexShrink: 0,
          }}
        >×</button>
      </div>
      <InputMontoPeriodicidad
        monto={monto} periodicidad={periodicidad}
        onMonto={onMonto} onPeriodicidad={onPeriodicidad}
        placeholder="Monto del pago"
      />
    </div>
  );
}

// ─── Paso 06: Gastos fijos ────────────────────────────────────
function PasoGastosFijos({ onSiguiente, onSaltar, seleccionados, setSeleccionados, montos, setMontos, periodicidades, setPeriodicidades, otros, setOtros }: {
  onSiguiente: () => void; onSaltar: () => void;
  seleccionados: Set<string>; setSeleccionados: (s: Set<string>) => void;
  montos: Record<string, string>; setMontos: (m: Record<string, string>) => void;
  periodicidades: Record<string, string>; setPeriodicidades: (p: Record<string, string>) => void;
  otros: GastoOtro[]; setOtros: (o: GastoOtro[]) => void;
}) {
  const toggle = (id: string) => {
    haptico.seleccion();
    const s = new Set(seleccionados);
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
      // Poner "mensual" por defecto si no tiene periodicidad aún
      if (!periodicidades[id]) setPeriodicidades({ ...periodicidades, [id]: "mensual" });
    }
    setSeleccionados(s);
  };

  const setMonto = (id: string, v: string) => setMontos({ ...montos, [id]: v });
  const setPeriodicidad = (id: string, v: string) => setPeriodicidades({ ...periodicidades, [id]: v });

  const agregarOtro = () => {
    haptico.ligero();
    setOtros([...otros, { nombre: "", monto: "", periodicidad: "mensual" }]);
  };

  const actualizarOtro = (i: number, campo: keyof GastoOtro, valor: string) => {
    setOtros(otros.map((o, idx) =>
      idx === i ? { ...o, [campo]: campo === "monto" ? formatearNumero(valor) : valor } : o
    ));
  };

  const eliminarOtro = (i: number) => {
    haptico.ligero();
    setOtros(otros.filter((_, idx) => idx !== i));
  };

  // Total normalizado a equivalente mensual
  const total = Math.round(
    GASTOS_FIJOS_LISTA
      .filter(g => seleccionados.has(g.id))
      .reduce((s, g) => s + aEquivalenteMensual(montos[g.id] || "", periodicidades[g.id] || "mensual"), 0)
    + otros.reduce((s, o) => s + aEquivalenteMensual(o.monto, o.periodicidad || "mensual"), 0)
  );

  const hayAlgo = seleccionados.size > 0 || otros.length > 0;

  return (
    <Chrome paso={3} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 04 · Gastos fijos</Eyebrow>
          <Titulo>¿Cuáles son tus<br />gastos fijos?</Titulo>
          <Descripcion>
            Los que salen sin falta cada mes. Actívalos y escribe el monto.
          </Descripcion>
        </div>

        <div style={{ padding: "20px 20px 0", flex: 1, overflowY: "auto" }}>
          {/* Lista predefinida */}
          <div style={{
            background: C.surface, borderRadius: 16,
            border: `0.5px solid ${C.line}`, overflow: "hidden",
            boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            {GASTOS_FIJOS_LISTA.map((g, i) => (
              <FilaToggleMonto
                key={g.id}
                nombre={g.nombre} desc={g.desc}
                activo={seleccionados.has(g.id)}
                monto={montos[g.id] || ""}
                periodicidad={periodicidades[g.id] || "mensual"}
                onToggle={() => toggle(g.id)}
                onMonto={v => setMonto(g.id, v)}
                onPeriodicidad={v => setPeriodicidad(g.id, v)}
                esUltima={i === GASTOS_FIJOS_LISTA.length - 1}
              />
            ))}

            {/* Filas de "otros" personalizados */}
            {otros.map((o, i) => (
              <FilaOtro
                key={i} index={i}
                nombre={o.nombre} monto={o.monto}
                periodicidad={o.periodicidad || "mensual"}
                onNombre={v => actualizarOtro(i, "nombre", v)}
                onMonto={v => actualizarOtro(i, "monto", v)}
                onPeriodicidad={v => actualizarOtro(i, "periodicidad", v)}
                onEliminar={() => eliminarOtro(i)}
              />
            ))}
          </div>

          {/* Botón agregar otro */}
          <button
            onClick={agregarOtro}
            style={{
              marginTop: 10, width: "100%", padding: "11px",
              background: "transparent", border: `0.5px dashed rgba(14,14,16,0.2)`,
              borderRadius: 12, cursor: "pointer",
              fontFamily: F.sans, fontSize: 13, color: C.textDim,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Agregar otro gasto fijo
          </button>

          {/* Total */}
          {total > 0 && (
            <div style={{
              marginTop: 12,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px",
              background: C.surface, border: `0.5px solid ${C.line}`, borderRadius: 12,
            }}>
              <div style={{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.5, color: C.textFaint, textTransform: "uppercase" }}>
                Total fijos / mes
              </div>
              <div style={{
                fontFamily: F.sans, fontSize: 16, fontWeight: 600,
                color: C.text, fontVariantNumeric: "tabular-nums", letterSpacing: -0.4,
              }}>
                ${total.toLocaleString("en-US")}
              </div>
            </div>
          )}
        </div>
      </div>

      <Pie>
        <LaniNote pose="hi">Los separo de tus gastos variables para un análisis más claro.</LaniNote>
        <BotonPrimario onClick={onSiguiente}>
          {!hayAlgo ? "No tengo fijos" : "Continuar"}
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
    <Chrome paso={4} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 05 · Deudas</Eyebrow>
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
    <Chrome paso={5} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 06 · Meta</Eyebrow>
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

function PasoPresupuestos({ onSiguiente, onSaltar, categorias, limites, setLimites, guardando }: {
  onSiguiente: () => void; onSaltar: () => void;
  categorias: Set<string>;
  limites: Record<string, string>;
  setLimites: (l: Record<string, string>) => void;
  guardando: boolean;
}) {
  const cats = CATEGORIAS.filter(c => categorias.has(c.id)).slice(0, 6);
  const setLimite = (id: string, valor: string) => {
    setLimites({ ...limites, [id]: formatearNumero(valor) });
  };
  const tieneAlguno = cats.some(c => (limites[c.id] || "").replace(/,/g, "").length > 0);

  return (
    <Chrome paso={6} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 07 · Presupuestos</Eyebrow>
          <Titulo>Límites por<br />categoría.</Titulo>
          <Descripcion>
            Define cuánto quieres gastar cada mes. Te aviso antes de que te pases.
          </Descripcion>
        </div>

        <div style={{ padding: "20px 20px 0", flex: 1, overflowY: "auto" }}>
          <div style={{
            background: C.surface, borderRadius: 16,
            border: `0.5px solid ${C.line}`, overflow: "hidden",
            boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            {cats.map((cat, i) => {
              const limite = limites[cat.id] || "";
              return (
                <div key={cat.id} style={{
                  padding: "13px 16px",
                  borderBottom: i < cats.length - 1 ? `0.5px solid ${C.divider}` : "none",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: C.text, letterSpacing: -0.1 }}>
                    {cat.nombre}
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{
                      position: "absolute", left: 10, fontSize: 15,
                      color: C.textFaint, pointerEvents: "none",
                    }}>$</span>
                    <input
                      type="text" inputMode="numeric"
                      value={limite}
                      placeholder="0"
                      onChange={e => setLimite(cat.id, e.target.value)}
                      style={{
                        width: 115, height: 40, borderRadius: 10,
                        border: `0.5px solid ${C.line}`, background: C.surface2,
                        color: C.text, fontFamily: F.sans, fontSize: 15, fontWeight: 500,
                        padding: "0 10px 0 24px", outline: "none",
                        letterSpacing: -0.3, boxSizing: "border-box",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Pie>
        <LaniNote pose="shy">Te aviso antes de que te pases 🐑</LaniNote>
        <BotonPrimario onClick={onSiguiente} cargando={guardando}>
          {tieneAlguno ? "Guardar límites" : "Omitir por ahora"}
        </BotonPrimario>
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
    <Chrome paso={7} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 08 · Revisión</Eyebrow>
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

// ─── Paso 11: WhatsApp ────────────────────────────────────────
function PasoWhatsApp({ onSiguiente, onSaltar, telefono, setTelefono }: {
  onSiguiente: () => void; onSaltar: () => void;
  telefono: string; setTelefono: (t: string) => void;
}) {
  const [error, setError] = useState("");

  // Formatea a XXX XXX XXXX mientras escribe (solo dígitos, máx 10)
  const handleChange = (raw: string) => {
    const digitos = raw.replace(/\D/g, "").slice(0, 10);
    let formateado = digitos;
    if (digitos.length > 6) formateado = digitos.slice(0, 3) + " " + digitos.slice(3, 6) + " " + digitos.slice(6);
    else if (digitos.length > 3) formateado = digitos.slice(0, 3) + " " + digitos.slice(3);
    setTelefono(formateado);
    setError("");
  };

  const digitos = telefono.replace(/\D/g, "");
  const listo   = digitos.length === 10;

  const handleSiguiente = () => {
    if (!listo && digitos.length > 0) { setError("Necesito los 10 dígitos de tu número"); return; }
    onSiguiente();
  };

  return (
    <Chrome paso={8} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 09 · WhatsApp</Eyebrow>
          <Titulo>Registra gastos<br />desde WhatsApp.</Titulo>
          <Descripcion>
            Mándame un mensaje y lo anoto al instante. Sin abrir la app.
          </Descripcion>
        </div>

        {/* Preview de conversación */}
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{
            background: C.surface, borderRadius: 18, border: `0.5px solid ${C.line}`,
            overflow: "hidden", boxShadow: "0 1px 2px rgba(14,14,16,0.03)",
          }}>
            {/* Header tipo WhatsApp */}
            <div style={{
              padding: "12px 16px", borderBottom: `0.5px solid ${C.line}`,
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(47,143,135,0.06)",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 99, background: C.accentSoft, border: `0.5px solid ${C.accentLine}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🐑</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: -0.1 }}>Lani</div>
                <div style={{ fontFamily: F.mono, fontSize: 9, color: C.accent, letterSpacing: 0.8 }}>● EN LÍNEA</div>
              </div>
            </div>

            {/* Mensajes */}
            <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
              {/* Turn 1 — usuario */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "72%", padding: "8px 12px", borderRadius: "14px 14px 4px 14px", background: C.text }}>
                  <div style={{ fontSize: 13, color: "#fff", letterSpacing: -0.1 }}>gasté 500 en taxi</div>
                </div>
              </div>
              {/* Turn 1 — Lani */}
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "82%", padding: "8px 12px", borderRadius: "4px 14px 14px 14px", background: C.surface2, border: `0.5px solid ${C.line}` }}>
                  <div style={{ fontSize: 13, color: C.text, letterSpacing: -0.1 }}>
                    ✓ Taxi <span style={{ fontWeight: 700 }}>$500</span> anotado 🐑{" "}
                    <span style={{ color: C.textFaint }}>Ya van $1,240 este mes en rides, ojo.</span>
                  </div>
                </div>
              </div>
              {/* Turn 2 — usuario */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <div style={{ maxWidth: "72%", padding: "8px 12px", borderRadius: "14px 14px 4px 14px", background: C.text }}>
                  <div style={{ fontSize: 13, color: "#fff", letterSpacing: -0.1 }}>cuánto he gastado en transporte?</div>
                </div>
              </div>
              {/* Turn 2 — Lani burbuja 1 */}
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "78%", padding: "8px 12px", borderRadius: "4px 14px 14px 14px", background: C.surface2, border: `0.5px solid ${C.line}` }}>
                  <div style={{ fontSize: 13, color: C.text, letterSpacing: -0.1 }}>
                    Este mes: <span style={{ fontWeight: 700, color: C.red }}>$1,240</span> en Transporte 🚗
                  </div>
                </div>
              </div>
              {/* Turn 2 — Lani burbuja 2 */}
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "86%", padding: "8px 12px", borderRadius: "4px 14px 14px 14px", background: C.surface2, border: `0.5px solid ${C.line}` }}>
                  <div style={{ fontSize: 13, color: C.text, letterSpacing: -0.1 }}>
                    El Uber se está comiendo el 70% de eso 💀 ¿Le pongo un límite de <span style={{ fontWeight: 600 }}>$1,500</span> y te aviso?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input teléfono */}
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{
            fontFamily: F.mono, fontSize: 10, letterSpacing: 2, color: C.textFaint,
            textTransform: "uppercase", marginBottom: 10, padding: "0 2px",
          }}>Tu número de WhatsApp</div>

          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontFamily: F.sans, fontSize: 15, fontWeight: 500, color: C.textFaint,
              pointerEvents: "none", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 18 }}>🇲🇽</span>
              <span>+52</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              value={telefono}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="55 1234 5678"
              style={{
                width: "100%", height: 54, borderRadius: 14, border: "none",
                paddingLeft: 88, paddingRight: 16,
                fontFamily: F.sans, fontSize: 22, fontWeight: 500,
                background: C.surface,
                boxShadow: `inset 0 0 0 1.5px ${error ? C.red : listo ? C.accent : C.line}`,
                color: C.text, letterSpacing: 0.5, outline: "none",
                transition: "box-shadow 200ms",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ marginTop: 8, fontSize: 12, color: C.red, fontFamily: F.sans, padding: "0 2px" }}>{error}</div>
          )}

          <div style={{ marginTop: 10, fontSize: 11.5, color: C.textFaint, fontFamily: F.sans, lineHeight: 1.5, padding: "0 2px" }}>
            Solo número mexicano. Tu número es privado y solo lo uso para identificarte.
          </div>
        </div>
      </div>

      <Pie>
        <LaniNote pose="wave">Mándame un mensaje en WhatsApp y lo registro al tiro.</LaniNote>
        <BotonPrimario onClick={handleSiguiente} disabled={digitos.length > 0 && !listo}>
          {digitos.length === 0 ? "Saltar por ahora" : "Activar WhatsApp"}
        </BotonPrimario>
      </Pie>
    </Chrome>
  );
}

// ─── Paso 12: Notificaciones push ─────────────────────────────
function PasoNotificaciones({ onSiguiente, onSaltar }: {
  onSiguiente: () => void; onSaltar: () => void;
}) {
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "denegado">("idle");

  const activar = async () => {
    setEstado("cargando");
    const ok = await suscribirAPush();
    setEstado(ok ? "ok" : "denegado");
    if (ok) setTimeout(onSiguiente, 900);
  };

  const ALERTAS = [
    { icono: "⚠️", titulo: "Transporte: 80% del límite",  sub: "Llevas $1,200 de $1,500 este mes", color: C.amber },
    { icono: "🐑", titulo: "Lani detectó una suscripción", sub: "Pagaste $219 en algo que no usas",  color: C.accent },
    { icono: "✅", titulo: "¡Meta cumplida!",              sub: "Llegaste a tu fondo de emergencia", color: C.green },
  ];

  return (
    <Chrome paso={9} onSaltar={onSaltar} esUltimo={false}>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 11 · Notificaciones</Eyebrow>
          <Titulo>Avísame cuando<br />algo importe.</Titulo>
          <Descripcion>
            Te mando una notificación cuando te acerques a un límite, llegues a una meta o detecte algo raro.
          </Descripcion>
        </div>

        {/* Mock de notificaciones del sistema */}
        <div style={{ padding: "20px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {ALERTAS.map((a, i) => (
            <div key={i} style={{
              background: C.surface, borderRadius: 16, border: `0.5px solid ${C.line}`,
              padding: "13px 14px", display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 1px 3px rgba(14,14,16,0.04)",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: `${a.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>{a.icono}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: -0.1, marginBottom: 2 }}>{a.titulo}</div>
                <div style={{ fontSize: 11.5, color: C.textFaint, letterSpacing: -0.05 }}>{a.sub}</div>
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.textFaint, flexShrink: 0 }}>ahora</div>
            </div>
          ))}
        </div>

        {/* Estado después de respuesta del browser */}
        {estado === "ok" && (
          <div style={{ margin: "16px 20px 0", padding: "12px 16px", borderRadius: 12, background: `${C.green}14`, border: `0.5px solid ${C.green}40`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.green, letterSpacing: -0.1 }}>¡Notificaciones activadas!</p>
          </div>
        )}
        {estado === "denegado" && (
          <div style={{ margin: "16px 20px 0", padding: "12px 16px", borderRadius: 12, background: `${C.amber}14`, border: `0.5px solid ${C.amber}40` }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.amber, letterSpacing: -0.1 }}>
              Sin permiso por ahora. Puedes activarlas después en Perfil.
            </p>
          </div>
        )}
      </div>

      <Pie>
        <LaniNote pose="happy">Te aviso cuando algo merece tu atención — sin spam.</LaniNote>
        {estado === "denegado" ? (
          <BotonPrimario onClick={onSiguiente}>Continuar sin notificaciones</BotonPrimario>
        ) : (
          <BotonPrimario onClick={activar} cargando={estado === "cargando" || estado === "ok"} disabled={estado === "ok"}>
            Activar avisos
          </BotonPrimario>
        )}
        {estado === "idle" && (
          <button
            onClick={onSiguiente}
            style={{ width: "100%", marginTop: 10, padding: "12px 0", background: "none", border: "none", cursor: "pointer", fontFamily: F.sans, fontSize: 13, color: C.textFaint, letterSpacing: -0.1 }}
          >
            Ahora no
          </button>
        )}
      </Pie>
    </Chrome>
  );
}

// ─── Paso 13: Dashboard preview ───────────────────────────────
function PasoDashboard({ onFinalizar, onSaltar, nombre, cargando }: {
  onFinalizar: () => void; onSaltar: () => void;
  nombre: string; cargando?: boolean;
}) {
  return (
    <Chrome paso={10} onSaltar={onSaltar} esUltimo>
      <div style={{ padding: "28px 0 0", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px" }}>
          <Eyebrow>Paso 12 · Listo</Eyebrow>
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
  const [gastosFijos,           setGastosFijos]           = useState<Set<string>>(new Set());
  const [montosGastosFijos,     setMontosGastosFijos]     = useState<Record<string, string>>({});
  const [periodicidadesGastos,  setPeriodicidadesGastos]  = useState<Record<string, string>>({});
  const [otrosGastosFijos,      setOtrosGastosFijos]      = useState<GastoOtro[]>([]);

  // Deudas (paso 07)
  const [deudas, setDeudas] = useState<Set<string>>(new Set());

  // Meta de ahorro (paso 08)
  const [metaNombre, setMetaNombre] = useState("Fondo de emergencia");
  const [metaMonto,  setMetaMonto]  = useState("");
  const [metaMeses,  setMetaMeses]  = useState(12);

  // Periodo de revisión (paso 08)
  const [periodoRevision, setPeriodoRevision] = useState<PeriodoRevision>("quincenal");

  // Presupuestos (paso 07) — mapa de categoriaId → monto límite
  const [limitesPresupuesto, setLimitesPresupuesto] = useState<Record<string, string>>({});

  // WhatsApp (paso 09)
  const [telefonoWA, setTelefonoWA] = useState("");

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
    const ingresoNum   = parseFloat(montoIngreso.replace(/,/g, "")) || 0;
    const metaMontoNum = parseFloat(metaMonto.replace(/,/g, "")) || 0;
    const cats         = Array.from(seleccionadas);
    const hoy          = new Date().toISOString().split("T")[0];

    // Mapeo de ID de gasto fijo → categoría de transacción
    const categoriaGastoFijo: Record<string, string> = {
      renta:     "Hogar",
      luz:       "Servicios",
      agua:      "Servicios",
      internet:  "Servicios",
      celular:   "Servicios",
      streaming: "Entretenimiento",
      gym:       "Salud",
      seguro:    "Servicios",
      colegio:   "Educación",
    };

    // Serializar gastos fijos con montos y periodicidad
    const gastosFijosData = {
      items: GASTOS_FIJOS_LISTA
        .filter(g => gastosFijos.has(g.id))
        .map(g => ({
          id: g.id,
          nombre: g.nombre,
          monto: parseFloat((montosGastosFijos[g.id] || "").replace(/,/g, "")) || 0,
          periodicidad: periodicidadesGastos[g.id] || "mensual",
          montoMensual: Math.round(aEquivalenteMensual(montosGastosFijos[g.id] || "", periodicidadesGastos[g.id] || "mensual")),
        })),
      otros: otrosGastosFijos
        .filter(o => o.nombre.trim())
        .map(o => ({
          nombre: o.nombre.trim(),
          monto: parseFloat((o.monto || "").replace(/,/g, "")) || 0,
          periodicidad: o.periodicidad || "mensual",
          montoMensual: Math.round(aEquivalenteMensual(o.monto, o.periodicidad || "mensual")),
        })),
    };

    // localStorage
    localStorage.setItem("lani_ingreso",         JSON.stringify({ frecuencia: frecuenciaIngreso, monto: ingresoNum }));
    localStorage.setItem("lani_gastos_fijos",     JSON.stringify(gastosFijosData));
    localStorage.setItem("lani_deudas",           JSON.stringify(Array.from(deudas)));
    localStorage.setItem("lani_meta",             JSON.stringify({ nombre: metaNombre, monto: metaMontoNum, meses: metaMeses }));
    localStorage.setItem("lani_periodo_revision", periodoRevision);
    localStorage.setItem("lani_categorias",       JSON.stringify(cats));

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Guardar metadata en auth
      await supabase.auth.updateUser({
        data: {
          categorias_activas: cats,
          ingreso:            { frecuencia: frecuenciaIngreso, monto: ingresoNum },
          gastos_fijos:       gastosFijosData,
          deudas:             Array.from(deudas),
          meta_ahorro:        { nombre: metaNombre, monto: metaMontoNum, meses: metaMeses },
          periodo_revision:   periodoRevision,
        },
      });

      // 2. Crear transacciones reales desde gastos fijos (para que el dashboard no quede en $0)
      const txFijos: {
        usuario_id: string; monto: number; descripcion: string;
        categoria: string; tipo: string; fecha: string;
      }[] = [];

      for (const item of gastosFijosData.items) {
        const montoTx = item.montoMensual || item.monto;
        if (montoTx > 0) {
          txFijos.push({
            usuario_id:  user.id,
            monto:       montoTx,
            descripcion: item.nombre,
            categoria:   categoriaGastoFijo[item.id] || "Servicios",
            tipo:        "gasto",
            fecha:       hoy,
          });
        }
      }
      for (const otro of gastosFijosData.otros) {
        const montoTx = otro.montoMensual || otro.monto;
        if (montoTx > 0) {
          txFijos.push({
            usuario_id:  user.id,
            monto:       montoTx,
            descripcion: otro.nombre,
            categoria:   "Servicios",
            tipo:        "gasto",
            fecha:       hoy,
          });
        }
      }
      if (txFijos.length > 0) {
        await supabase.from("transacciones").insert(txFijos);
      }

      // 3. Crear transacción de ingreso mensual si lo especificó
      if (ingresoMensual > 0) {
        await supabase.from("transacciones").insert({
          usuario_id:  user.id,
          monto:       ingresoMensual,
          descripcion: "Ingreso mensual",
          categoria:   "Otros",
          tipo:        "ingreso",
          fecha:       hoy,
        });
      }

      // 4. Guardar presupuestos en DB
      const presupuestosAGuardar = CATEGORIAS
        .filter(c => seleccionadas.has(c.id) && (limitesPresupuesto[c.id] || "").replace(/,/g, "").length > 0)
        .map(c => ({
          usuario_id: user.id,
          categoria:  c.nombre,
          limite:     parseFloat((limitesPresupuesto[c.id] || "").replace(/,/g, "")) || 0,
          periodo:    "mensual",
        }))
        .filter(p => p.limite > 0);

      if (presupuestosAGuardar.length > 0) {
        await supabase.from("presupuestos").insert(presupuestosAGuardar);
      }

      // 5. Crear meta de ahorro en DB si la definió
      if (metaMontoNum > 0 && metaNombre.trim()) {
        await supabase.from("metas").insert({
          usuario_id:     user.id,
          nombre:         metaNombre.trim(),
          emoji:          "🎯",
          monto_objetivo: metaMontoNum,
          monto_actual:   0,
        });
      }
    } catch (err) {
      console.error("Error guardando onboarding:", err);
    }
  };

  // ── Navegación ────────────────────────────────────────────────
  const siguiente = async () => {
    haptico.ligero();

    if (paso === PASO_CATEGORIAS) {
      setGuardando(true);
      await guardarCategorias();
      setGuardando(false);
    }

    if (paso === PASO_WHATSAPP) {
      const digitos = telefonoWA.replace(/\D/g, "");
      if (digitos.length === 10) {
        try {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const telefono = "52" + digitos;
            await supabase.from("perfiles").upsert(
              { id: user.id, telefono_whatsapp: telefono },
              { onConflict: "id" }
            );
          }
        } catch { /* no bloqueamos el flujo */ }
      }
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
  if (paso === 0)  return <Paso1              onSiguiente={siguiente} onSaltar={saltar} nombre={nombre} />;
  if (paso === 1)  return <PasoIngresos       onSiguiente={siguiente} onSaltar={saltar} frecuencia={frecuenciaIngreso} setFrecuencia={setFrecuenciaIngreso} monto={montoIngreso} setMonto={setMontoIngreso} />;
  if (paso === 2)  return <PasoCategoriasStep onSiguiente={siguiente} onSaltar={saltar} seleccionadas={seleccionadas} setSeleccionadas={setSeleccionadas} guardando={guardando} />;
  if (paso === 3)  return <PasoGastosFijos    onSiguiente={siguiente} onSaltar={saltar} seleccionados={gastosFijos} setSeleccionados={setGastosFijos} montos={montosGastosFijos} setMontos={setMontosGastosFijos} periodicidades={periodicidadesGastos} setPeriodicidades={setPeriodicidadesGastos} otros={otrosGastosFijos} setOtros={setOtrosGastosFijos} />;
  if (paso === 4)  return <PasoDeudas         onSiguiente={siguiente} onSaltar={saltar} seleccionadas={deudas} setSeleccionadas={setDeudas} />;
  if (paso === 5)  return <PasoMeta           onSiguiente={siguiente} onSaltar={saltar} nombre={metaNombre} setNombre={setMetaNombre} monto={metaMonto} setMonto={setMetaMonto} meses={metaMeses} setMeses={setMetaMeses} ingresoMensual={ingresoMensual} />;
  if (paso === 6)  return <PasoPresupuestos   onSiguiente={siguiente} onSaltar={saltar} categorias={seleccionadas} limites={limitesPresupuesto} setLimites={setLimitesPresupuesto} guardando={guardando} />;
  if (paso === 7)  return <PasoPeriodo        onSiguiente={siguiente} onSaltar={saltar} periodo={periodoRevision} setPeriodo={setPeriodoRevision} />;
  if (paso === 8)  return <PasoWhatsApp       onSiguiente={siguiente} onSaltar={saltar} telefono={telefonoWA} setTelefono={setTelefonoWA} />;
  if (paso === 9)  return <PasoNotificaciones onSiguiente={siguiente} onSaltar={saltar} />;
  return                  <PasoDashboard      onFinalizar={siguiente} onSaltar={saltar} nombre={nombre} cargando={guardando} />;
}
