"use client";

import { useState, useMemo } from "react";

// ─── Dataset completo por categoría ──────────────────────────────────────────
const CATS = [
  {
    key: "recientes",
    icono: "🕐",
    emojis: [] as string[], // se llena desde localStorage
  },
  {
    key: "comida",
    icono: "🍽",
    emojis: ["🍽","🍕","🍔","🌮","🍜","🍣","🌯","🥗","🍱","🍰","☕","🧃","🍺","🍷","🥤","🍦","🧁","🍪","🥐","🍳","🥩","🍗","🥦","🍇","🍓","🥑","🧆","🍛","🥘","🫕"],
  },
  {
    key: "compras",
    icono: "🛍",
    emojis: ["🛍","🛒","👕","👟","💄","👜","💎","🎁","🧴","🕶","🧢","👠","👚","💍","🧣","🎀","🪞","👒","🩱","🥿","👔","🧥","🩲","🩳","👗","👘","🥾","🧤","💼","🪮"],
  },
  {
    key: "transporte",
    icono: "🚗",
    emojis: ["🚗","🚕","🚌","✈️","🚂","🚢","🛵","⛽","🚲","🏎","🚁","🛻","🚤","🛸","🚐","🏍","⛵","🛺","🚑","🚒","🚓","🛩","🛳","🚀","🚟","🚠","🚡","🛤","⛴","🚜"],
  },
  {
    key: "salud",
    icono: "💊",
    emojis: ["💊","🏋️","🏃","⚽","🎾","🧘","🏊","🥊","🏥","💉","🩺","🧗","🤸","🏄","🎯","🚴","🤾","🧬","🩻","🦷","💪","🧠","👁","🩹","🩼","🧘","⚕️","🏐","🏀","⚾"],
  },
  {
    key: "hogar",
    icono: "🏠",
    emojis: ["🏠","🛋","🪴","🧹","⚡","💡","🔧","🚿","🛏","📺","🧺","🏡","🔑","🪟","🧸","🪑","🪣","🪜","🔒","🧲","🪠","🛁","🚽","🪥","🧻","🍳","🫖","🧊","🪤","🏗"],
  },
  {
    key: "ocio",
    icono: "🎬",
    emojis: ["🎬","🎮","🎵","🎸","🎭","📚","🎨","🎲","🎤","📷","🎧","🎪","🎡","🃏","🎰","🎻","🥁","🎠","🎟","🧩","🎯","🎳","🎲","🎹","🎺","🪗","🎼","📽","🎞","🎙"],
  },
  {
    key: "trabajo",
    icono: "💼",
    emojis: ["💼","💰","💳","📊","🏦","📝","💻","📱","📋","✏️","📌","🖊","📁","🔒","📈","🖥","📞","🗂","🗃","📎","🖇","📐","📏","🗑","📬","📦","🏧","💹","📉","🔐"],
  },
  {
    key: "naturaleza",
    icono: "🌿",
    emojis: ["🌿","🐶","🐱","🌍","🌴","🌺","🌊","🏔","🌋","🌈","🦋","🌸","🍀","🌻","🌙","☀️","⭐","🔥","❄️","🌪","🐾","🦜","🐠","🦁","🐻","🌵","🍄","🌾","🪸","🐝"],
  },
];

const RECIENTES_KEY = "lani_emojis_recientes";
const MAX_RECIENTES = 20;

function getRecientes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECIENTES_KEY) || "[]");
  } catch { return []; }
}

function guardarReciente(emoji: string) {
  if (typeof window === "undefined") return;
  try {
    const prev = getRecientes().filter((e) => e !== emoji);
    localStorage.setItem(RECIENTES_KEY, JSON.stringify([emoji, ...prev].slice(0, MAX_RECIENTES)));
  } catch { /* ignore */ }
}

interface Props {
  valorActual: string;
  onSeleccionar: (emoji: string) => void;
}

export default function EmojiPicker({ valorActual, onSeleccionar }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [catActiva, setCatActiva] = useState(1); // empieza en comida

  const recientes = getRecientes();

  // Resultados de búsqueda: recorre todas las categorías
  const resultadosBusqueda = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = busqueda.toLowerCase();
    const encontrados: string[] = [];
    for (const cat of CATS.slice(1)) {
      for (const e of cat.emojis) {
        if (e.includes(q) || cat.key.includes(q)) {
          if (!encontrados.includes(e)) encontrados.push(e);
        }
      }
    }
    return encontrados;
  }, [busqueda]);

  // Lista de emojis a mostrar
  const emojisActivos = busqueda.trim()
    ? resultadosBusqueda
    : catActiva === 0
    ? recientes
    : CATS[catActiva].emojis;

  const handleSelect = (e: string) => {
    guardarReciente(e);
    onSeleccionar(e);
  };

  return (
    <div style={{
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid var(--border)",
      backgroundColor: "var(--surface)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      {/* Buscador */}
      <div style={{ padding: "10px 10px 8px", borderBottom: "1px solid var(--border-2)" }}>
        <div style={{ position: "relative" }}>
          <svg
            viewBox="0 0 20 20" fill="var(--text-3)"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, pointerEvents: "none" }}
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Buscar emoji..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoComplete="off"
            style={{
              width: "100%",
              paddingLeft: 32, paddingRight: 10,
              paddingTop: 8, paddingBottom: 8,
              borderRadius: 10,
              fontSize: 13,
              backgroundColor: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
              outline: "none",
            }}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 14, lineHeight: 1, padding: 2 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Tabs de categoría */}
      {!busqueda && (
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            padding: "6px 8px 0",
            backgroundColor: "var(--surface)",
            borderBottom: "1px solid var(--border-2)",
            gap: 2,
          }}
          className="no-scroll"
        >
          {CATS.map((cat, idx) => {
            if (idx === 0 && recientes.length === 0) return null;
            const activa = catActiva === idx;
            return (
              <button
                key={cat.key}
                onClick={() => setCatActiva(idx)}
                title={cat.key}
                style={{
                  flexShrink: 0,
                  width: 34, height: 30,
                  borderRadius: "8px 8px 0 0",
                  border: "none",
                  fontSize: 17,
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  borderBottom: activa ? "2px solid #0F2F2F" : "2px solid transparent",
                  opacity: activa ? 1 : 0.5,
                  transition: "all 0.12s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {cat.icono}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid de emojis */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 1,
          padding: "8px 6px",
          minHeight: 100,
          maxHeight: 155,
          overflowY: "auto",
        }}
        className="no-scroll"
      >
        {emojisActivos.length === 0 ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "24px 0", color: "var(--text-3)", fontSize: 12 }}>
            {busqueda ? "Sin resultados" : "Sin recientes"}
          </div>
        ) : (
          emojisActivos.map((emoji) => {
            const sel = valorActual === emoji;
            return (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="active:scale-90 transition-transform"
                style={{
                  aspectRatio: "1",
                  borderRadius: 8,
                  border: sel ? "1.5px solid #0F2F2F" : "1.5px solid transparent",
                  backgroundColor: sel ? "rgba(15,47,47,0.09)" : "transparent",
                  fontSize: 21,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {emoji}
              </button>
            );
          })
        )}
      </div>

      {/* Footer: emoji seleccionado */}
      <div style={{
        padding: "6px 12px",
        borderTop: "1px solid var(--border-2)",
        display: "flex", alignItems: "center", gap: 8,
        backgroundColor: "var(--surface-2)",
      }}>
        <span style={{ fontSize: 24 }}>{valorActual}</span>
        <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>Seleccionado</p>
      </div>
    </div>
  );
}
