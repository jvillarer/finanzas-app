"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ── Pantallas ─────────────────────────────────────────────────────────────────
// altura: % del contenedor — calculado para que Lani se vea igual de grande en todas las pantallas
// Referencia: Lani_cropped (96% contenido) a 92% → Lani visual ≈ 88% del contenedor
// Lani_ticket_crop (85% contenido) → 92% / 85% * 96% ≈ 104%
// Lani_categorias_crop (77% contenido) → 92% / 77% * 96% ≈ 115%
const PANTALLAS = [
  { id: 1, titulo: "¡Hola! Soy Lani",            subtitulo: "Estoy aquí para ayudarte con tu dinero, sin estrés.", cta: "Continuar", imagen: "/Lani_cropped.png",         altura: "92%",  bajada: "0%"  },
  { id: 2, titulo: "Toma una foto a tu ticket",   subtitulo: "Yo registro todo automáticamente.",                  cta: "Continuar", imagen: "/Lani_ticket_crop.png",     altura: "104%", bajada: "0%"  },
  { id: 3, titulo: "Háblame por WhatsApp",         subtitulo: "Solo dime lo que gastaste.",                         cta: "Continuar", imagen: "/Lani_whatsapp_crop.png",  altura: "90%",  bajada: "6%"    },
  { id: 4, titulo: "Yo organizo todo",             subtitulo: "Tus gastos se ordenan solos.",                       cta: "Continuar", imagen: "/Lani_organiza_crop.png",   altura: "89%",  bajada: "7%"  },
  { id: 5, titulo: "Entiende tu dinero",           subtitulo: "Gráficas simples y claras.",                         cta: "Continuar", imagen: "/Lani_dinero_crop.png",     altura: "92%",  bajada: "0%"  },
  { id: 6, titulo: "Cumple tus metas",             subtitulo: "Ahorra y celebra conmigo.",                          cta: "¡Empezar!", imagen: "/Lani_metas_crop.png",      altura: "89%",  bajada: "0%"  },
];

// ── Texto con fade+slide al cambiar pantalla ──────────────────────────────────
function SeccionTexto({ pantalla }: { pantalla: typeof PANTALLAS[0] }) {
  const [mostrado, setMostrado] = useState(pantalla);
  const [visible, setVisible]   = useState(true);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => { setMostrado(pantalla); setVisible(true); }, 150);
    return () => clearTimeout(t);
  }, [pantalla.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      flexShrink: 0,
      height: "22%",
      paddingLeft:   28,
      paddingRight:  28,
      paddingTop:    80,       // empuja el texto hacia abajo dentro de la sección
      paddingBottom: 8,
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      justifyContent: "flex-end",
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0px)" : "translateY(6px)",
      transition: "opacity 0.25s ease, transform 0.25s ease",
    }}>
      <h1 style={{
        fontSize:      30,
        fontWeight:    800,
        color:         "#ffffff",
        textAlign:     "center",
        lineHeight:    1.2,
        letterSpacing: "-0.5px",
        margin:        "0 0 6px 0",
      }}>
        {mostrado.titulo}
      </h1>
      <p style={{
        fontSize:   16,
        color:      "rgba(207,232,232,0.65)",
        textAlign:  "center",
        maxWidth:   280,
        lineHeight: "1.38",
        margin:     0,
      }}>
        {mostrado.subtitulo}
      </p>
    </div>
  );
}

// ── Dots de paginación ────────────────────────────────────────────────────────
function Dots({ total, actual }: { total: number; actual: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 10 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width:           i === actual ? 20 : 8,
          height:          8,
          borderRadius:    4,
          backgroundColor: i === actual ? "#ffffff" : "#5A7D7D",
          transition:      "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }} />
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props { onContinuar?: () => void; }

export default function OnboardingStep1({ onContinuar }: Props) {
  const [indice,     setIndice]     = useState(0);
  const [presionado, setPresionado] = useState(false);
  const [terminado,  setTerminado]  = useState(false);

  const sliderRef    = useRef<HTMLDivElement>(null);
  const touchStartX  = useRef<number | null>(null);
  const touchStartY  = useRef<number | null>(null);
  const arrastrando  = useRef(false);
  const mouseStartX  = useRef<number | null>(null);
  const mouseDrag    = useRef(false);

  const irA = useCallback((idx: number) => {
    const c = Math.max(0, Math.min(PANTALLAS.length - 1, idx));
    setIndice(c);
    if (sliderRef.current) {
      sliderRef.current.style.transition = "transform 0.35s cubic-bezier(0.4,0,0.2,1)";
      sliderRef.current.style.transform  = `translateX(-${c * (100 / PANTALLAS.length)}%)`;
    }
  }, []);

  const handleCTA = () => {
    if (indice < PANTALLAS.length - 1) { irA(indice + 1); }
    else { setTerminado(true); onContinuar?.(); }
  };

  // Touch
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    arrastrando.current = false;
    if (sliderRef.current) sliderRef.current.style.transition = "none";
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!arrastrando.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) arrastrando.current = true;
    if (arrastrando.current && sliderRef.current) {
      const base = -indice * (100 / PANTALLAS.length);
      const ancho = sliderRef.current.parentElement?.offsetWidth ?? 1;
      sliderRef.current.style.transform = `translateX(calc(${base}% + ${dx * 0.7}px))`;
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (arrastrando.current) {
      if (dx < -40 && indice < PANTALLAS.length - 1) irA(indice + 1);
      else if (dx > 40 && indice > 0) irA(indice - 1);
      else irA(indice);
    }
    touchStartX.current = null;
    arrastrando.current = false;
  };

  // Mouse
  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    mouseDrag.current   = false;
    if (sliderRef.current) sliderRef.current.style.transition = "none";
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    if (!mouseDrag.current && Math.abs(dx) > 8) mouseDrag.current = true;
    if (mouseDrag.current && sliderRef.current) {
      const base = -indice * (100 / PANTALLAS.length);
      sliderRef.current.style.transform = `translateX(calc(${base}% + ${dx * 0.7}px))`;
    }
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    if (mouseDrag.current) {
      if (dx < -40 && indice < PANTALLAS.length - 1) irA(indice + 1);
      else if (dx > 40 && indice > 0) irA(indice - 1);
      else irA(indice);
    }
    mouseStartX.current = null;
    mouseDrag.current   = false;
  };

  // ── Pantalla final ──────────────────────────────────────────────────────────
  if (terminado) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0F2F2F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 32, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Lani_cropped.png" alt="Lani" style={{ width: 180, objectFit: "contain", filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.4))" }} />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>¡Todo listo!</h2>
          <p style={{ color: "#CFE8E8", fontSize: 16, lineHeight: "22px" }}>Lani está lista para ayudarte.</p>
        </div>
        <button onClick={() => { setTerminado(false); irA(0); }} style={{ height: 56, borderRadius: 28, border: "none", background: "#ffffff", color: "#0F2F2F", fontSize: 16, fontWeight: 600, width: "100%", maxWidth: 320, cursor: "pointer" }}>
          Ver de nuevo
        </button>
      </div>
    );
  }

  // ── Flujo principal ─────────────────────────────────────────────────────────
  return (
    <div style={{
      position:        "fixed",
      inset:           0,
      background:      "#0F2F2F",
      display:         "flex",
      flexDirection:   "column",
      overflow:        "hidden",
      userSelect:      "none",
      fontFamily:      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>

      {/* ── ARRIBA 22% — Texto ── */}
      <SeccionTexto pantalla={PANTALLAS[indice]} />

      {/* ── MEDIO flex:1 — Slider del borrego ── */}
      <div
        style={{ flexShrink: 0, flex: 1, overflow: "hidden", position: "relative", cursor: "grab" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}   onMouseMove={onMouseMove}  onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      >
        <div
          ref={sliderRef}
          style={{
            display:         "flex",
            flexDirection:   "row",
            height:          "100%",
            width:           `${PANTALLAS.length * 100}%`,
            transform:       `translateX(-${indice * (100 / PANTALLAS.length)}%)`,
            transition:      "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {PANTALLAS.map((pantalla, idx) => (
            <div
              key={pantalla.id}
              style={{
                width:          `${100 / PANTALLAS.length}%`,
                height:         "100%",
                flexShrink:     0,
                position:       "relative",
              }}
            >
              {/* Glow detrás */}
              <div style={{
                position:     "absolute",
                width:        300,
                height:       300,
                borderRadius: "50%",
                background:   "radial-gradient(circle, rgba(207,232,232,0.09) 0%, transparent 70%)",
                top:          "50%",
                left:         "50%",
                transform:    "translate(-50%, -50%)",
                pointerEvents:"none",
              }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pantalla.imagen}
                alt="Lani"
                draggable={false}
                style={{
                  position:   "absolute",
                  bottom:     pantalla.bajada,
                  left:       "50%",
                  transform:  idx === indice
                    ? "translateX(-50%) scale(1)"
                    : "translateX(-50%) scale(0.95)",
                  height:     pantalla.altura,
                  width:      "auto",
                  maxWidth:   "none",
                  objectFit:  "contain",
                  display:    "block",
                  filter:     "drop-shadow(0px 16px 32px rgba(0,0,0,0.35))",
                  transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── ABAJO 20% — Dots + Botón ── */}
      <div style={{
        flexShrink:     0,
        height:         "20%",
        paddingLeft:    24,
        paddingRight:   24,
        paddingBottom:  28,
        paddingTop:     0,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "flex-end",
      }}>
        <Dots total={PANTALLAS.length} actual={indice} />
        <button
          onMouseDown={() => setPresionado(true)}
          onMouseUp={() => setPresionado(false)}
          onMouseLeave={() => setPresionado(false)}
          onTouchStart={(e) => { e.preventDefault(); setPresionado(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setPresionado(false); handleCTA(); }}
          onClick={handleCTA}
          style={{
            height:        56,
            borderRadius:  28,
            border:        "none",
            background:    "#ffffff",
            color:         "#0F2F2F",
            fontSize:      16,
            fontWeight:    600,
            width:         "100%",
            cursor:        "pointer",
            transform:     presionado ? "scale(0.97)" : "scale(1)",
            transition:    "transform 0.15s ease, box-shadow 0.15s ease",
            boxShadow:     presionado ? "0 2px 8px rgba(0,0,0,0.15)" : "0 6px 20px rgba(0,0,0,0.25)",
            letterSpacing: "0.1px",
          }}
        >
          {PANTALLAS[indice].cta}
        </button>
      </div>
    </div>
  );
}
