"use client";

import { useEffect, useState } from "react";

export interface TourPaso {
  icono: string;
  titulo: string;
  desc: string;
}

interface Props {
  tourKey: string;      // clave localStorage, ej. "lani_tour_dashboard"
  titulo: string;
  subtitulo?: string;
  pasos: TourPaso[];
  // Modo controlado (para el botón ?)
  abierto?: boolean;
  onCerrar?: () => void;
}

function useLockBodyScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
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
  }, [activo]);
}

export default function TourSheet({ tourKey, titulo, subtitulo, pasos, abierto, onCerrar }: Props) {
  const [visibleAuto, setVisibleAuto] = useState(false);
  const esControlado = abierto !== undefined;
  const visible = esControlado ? abierto : visibleAuto;

  useEffect(() => {
    if (!esControlado && !localStorage.getItem(tourKey)) {
      const t = setTimeout(() => setVisibleAuto(true), 600);
      return () => clearTimeout(t);
    }
  }, [tourKey, esControlado]);

  useLockBodyScroll(visible);

  const cerrar = () => {
    if (esControlado) {
      onCerrar?.();
    } else {
      localStorage.setItem(tourKey, "1");
      setVisibleAuto(false);
    }
    // En ambos modos, marcar como visto
    localStorage.setItem(tourKey, "1");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
    >
      <div
        className="w-full slide-up"
        style={{
          backgroundColor: "var(--surface)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: "20px 20px 40px",
          borderTop: "1px solid var(--border)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Handle */}
        <div style={{ width: 32, height: 3, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: "var(--gold-dim)",
              border: "1px solid var(--gold-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}>🐑</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>{titulo}</p>
              {subtitulo && <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{subtitulo}</p>}
            </div>
          </div>
          <button
            onClick={cerrar}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: "var(--surface-2)", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 13, height: 13 }}>
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Pasos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {pasos.map((paso, i) => (
            <div key={i} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              padding: "14px 14px",
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 14,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                backgroundColor: "var(--gold-dim)",
                border: "1px solid var(--gold-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>{paso.icono}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.01em", marginBottom: 3 }}>{paso.titulo}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>{paso.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={cerrar}
          className="active:scale-[0.98] transition-transform"
          style={{
            width: "100%", padding: "14px 0", borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            backgroundColor: "var(--gold)", color: "#ffffff",
            border: "none", cursor: "pointer",
          }}
        >
          Entendido 👍
        </button>
      </div>
    </div>
  );
}

// Botón circular "?" para el header — re-abre el tour
export function TourBoton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: "50%",
        backgroundColor: "var(--surface-2)",
        border: "1px solid var(--border)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
      aria-label="Cómo funciona"
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", lineHeight: 1 }}>?</span>
    </button>
  );
}
