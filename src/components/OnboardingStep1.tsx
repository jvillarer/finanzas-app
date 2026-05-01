"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

// ── Pantallas del onboarding ──────────────────────────────────────────────────
const PANTALLAS = [
  {
    id: 1,
    titulo: "¡Hola! Soy Lani",
    subtitulo: "Estoy aquí para ayudarte con tu dinero, sin estrés.",
    cta: "Continuar",
  },
  {
    id: 2,
    titulo: "Toma una foto a tu ticket",
    subtitulo: "Yo registro todo automáticamente.",
    cta: "Continuar",
  },
  {
    id: 3,
    titulo: "Háblame por WhatsApp",
    subtitulo: "Solo dime lo que gastaste.",
    cta: "Continuar",
  },
  {
    id: 4,
    titulo: "Yo organizo todo",
    subtitulo: "Tus gastos se ordenan solos.",
    cta: "Continuar",
  },
  {
    id: 5,
    titulo: "Entiende tu dinero",
    subtitulo: "Gráficas simples y claras.",
    cta: "Continuar",
  },
  {
    id: 6,
    titulo: "Cumple tus metas",
    subtitulo: "Ahorra y celebra conmigo.",
    cta: "¡Empezar!",
  },
];

// ── Texto con animación fade+slide al cambiar pantalla ────────────────────────
function SeccionTexto({ pantalla }: { pantalla: typeof PANTALLAS[0] }) {
  const [mostrado, setMostrado] = useState(pantalla);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setMostrado(pantalla);
      setVisible(true);
    }, 150);
    return () => clearTimeout(t);
  }, [pantalla.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        flexShrink: 0,
        height: "20%",
        paddingLeft: 24,
        paddingRight: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(6px)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}
    >
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#ffffff",
          textAlign: "center",
          lineHeight: 1.25,
          letterSpacing: "-0.3px",
          margin: "0 0 8px 0",
        }}
      >
        {mostrado.titulo}
      </h1>
      <p
        style={{
          fontSize: 16,
          color: "#CFE8E8",
          textAlign: "center",
          maxWidth: 280,
          lineHeight: "22px",
          margin: 0,
          opacity: 0.9,
        }}
      >
        {mostrado.subtitulo}
      </p>
    </div>
  );
}

// ── Dots de paginación ────────────────────────────────────────────────────────
function PaginacionDots({ total, actual }: { total: number; actual: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        marginBottom: 16,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === actual ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i === actual ? "#ffffff" : "#5A7D7D",
            transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface Props {
  onContinuar?: () => void;
}

export default function OnboardingStep1({ onContinuar }: Props) {
  const [indiceActual, setIndiceActual] = useState(0);
  const [presionado, setPresionado] = useState(false);
  const [terminado, setTerminado] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const arrastrando = useRef(false);
  const mouseStartX = useRef<number | null>(null);
  const arrastandoMouse = useRef(false);

  const irA = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(PANTALLAS.length - 1, idx));
    setIndiceActual(clamped);
    if (sliderRef.current) {
      sliderRef.current.style.transition = "transform 0.35s cubic-bezier(0.4,0,0.2,1)";
      sliderRef.current.style.transform = `translateX(-${clamped * (100 / PANTALLAS.length)}%)`;
    }
  }, []);

  const handleCTA = () => {
    if (indiceActual < PANTALLAS.length - 1) {
      irA(indiceActual + 1);
    } else {
      setTerminado(true);
      onContinuar?.();
    }
  };

  // Touch swipe
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
    if (!arrastrando.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      arrastrando.current = true;
    }
    if (arrastrando.current && sliderRef.current) {
      const base = -indiceActual * (100 / PANTALLAS.length);
      const ancho = sliderRef.current.parentElement?.offsetWidth ?? 1;
      const pct = (dx / ancho) * (100 / PANTALLAS.length);
      sliderRef.current.style.transform = `translateX(calc(${base}% + ${pct * 0.7 * (ancho / 100)}px))`;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (arrastrando.current) {
      if (dx < -40 && indiceActual < PANTALLAS.length - 1) irA(indiceActual + 1);
      else if (dx > 40 && indiceActual > 0) irA(indiceActual - 1);
      else irA(indiceActual);
    }
    touchStartX.current = null;
    arrastrando.current = false;
  };

  // Mouse drag (desktop)
  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
    arrastandoMouse.current = false;
    if (sliderRef.current) sliderRef.current.style.transition = "none";
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    if (!arrastandoMouse.current && Math.abs(dx) > 8) arrastandoMouse.current = true;
    if (arrastandoMouse.current && sliderRef.current) {
      const base = -indiceActual * (100 / PANTALLAS.length);
      const ancho = sliderRef.current.parentElement?.offsetWidth ?? 1;
      const pct = (dx / ancho) * (100 / PANTALLAS.length);
      sliderRef.current.style.transform = `translateX(calc(${base}% + ${pct * 0.7 * (ancho / 100)}px))`;
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const dx = e.clientX - mouseStartX.current;
    if (arrastandoMouse.current) {
      if (dx < -40 && indiceActual < PANTALLAS.length - 1) irA(indiceActual + 1);
      else if (dx > 40 && indiceActual > 0) irA(indiceActual - 1);
      else irA(indiceActual);
    }
    mouseStartX.current = null;
    arrastandoMouse.current = false;
  };

  // ── Pantalla final ──────────────────────────────────────────────────────────
  if (terminado) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#0F2F2F",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: 32,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
        }}
      >
        <Image
          src="/Lani_Saludando_transparent.png"
          alt="Lani"
          width={180}
          height={180}
          style={{ objectFit: "contain", filter: "drop-shadow(0 16px 24px rgba(0,0,0,0.4))" }}
          priority
        />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>
            ¡Todo listo!
          </h2>
          <p style={{ color: "#CFE8E8", fontSize: 16, lineHeight: "22px" }}>
            Lani está lista para ayudarte.
          </p>
        </div>
        <button
          onClick={() => { setTerminado(false); irA(0); }}
          style={{
            height: 56,
            borderRadius: 28,
            border: "none",
            background: "#ffffff",
            color: "#0F2F2F",
            fontSize: 16,
            fontWeight: 600,
            width: "100%",
            maxWidth: 320,
            cursor: "pointer",
          }}
        >
          Ver de nuevo
        </button>
      </div>
    );
  }

  // ── Onboarding principal ────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#0F2F2F",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      }}
    >
      {/* ── 60% — Slider de personaje ── */}
      <div
        style={{
          flexShrink: 0,
          height: "60%",
          overflow: "hidden",
          position: "relative",
          cursor: "grab",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div
          ref={sliderRef}
          style={{
            display: "flex",
            flexDirection: "row",
            height: "100%",
            width: `${PANTALLAS.length * 100}%`,
            transform: `translateX(-${indiceActual * (100 / PANTALLAS.length)}%)`,
            transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {PANTALLAS.map((pantalla, idx) => (
            <div
              key={pantalla.id}
              style={{
                width: `${100 / PANTALLAS.length}%`,
                height: "100%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 16,
                position: "relative",
              }}
            >
              {/* Glow detrás del personaje */}
              <div
                style={{
                  position: "absolute",
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(207,232,232,0.09) 0%, transparent 70%)",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Lani_Saludando_transparent.png"
                alt="Lani"
                draggable={false}
                style={{
                  height: "95%",
                  width: "auto",
                  maxWidth: "90%",
                  objectFit: "contain",
                  display: "block",
                  filter: "drop-shadow(0px 16px 24px rgba(0,0,0,0.3))",
                  transform: idx === indiceActual
                    ? "scale(1) translateY(0px)"
                    : "scale(0.95) translateY(10px)",
                  transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── 20% — Título y subtítulo ── */}
      <SeccionTexto pantalla={PANTALLAS[indiceActual]} />

      {/* ── 20% — Dots + botón ── */}
      <div
        style={{
          flexShrink: 0,
          height: "20%",
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <PaginacionDots total={PANTALLAS.length} actual={indiceActual} />
        <button
          onMouseDown={() => setPresionado(true)}
          onMouseUp={() => setPresionado(false)}
          onMouseLeave={() => setPresionado(false)}
          onTouchStart={() => setPresionado(true)}
          onTouchEnd={() => { setPresionado(false); handleCTA(); }}
          onClick={handleCTA}
          style={{
            height: 56,
            borderRadius: 28,
            border: "none",
            background: "#ffffff",
            color: "#0F2F2F",
            fontSize: 16,
            fontWeight: 600,
            width: "100%",
            cursor: "pointer",
            transform: presionado ? "scale(0.97)" : "scale(1)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            boxShadow: presionado
              ? "0 2px 8px rgba(0,0,0,0.15)"
              : "0 6px 20px rgba(0,0,0,0.25)",
            letterSpacing: "0.1px",
          }}
        >
          {PANTALLAS[indiceActual].cta}
        </button>
      </div>
    </div>
  );
}
