"use client";

import { useState } from "react";

// ─── Emojis organizados por categoría ────────────────────────────────────────
const CATEGORIAS_EMOJI = [
  {
    icono: "🍽",
    label: "Comida",
    emojis: ["🍽","🍕","🍔","🌮","🍜","🍣","🌯","🥗","🍱","🍰","☕","🧃","🍺","🍷","🥤","🍦","🧁","🍪","🥐","🍳"],
  },
  {
    icono: "🛍",
    label: "Compras",
    emojis: ["🛍","🛒","👕","👟","💄","👜","💎","🎁","🧴","🕶","🧢","👠","👚","🩴","💍","🧣","🎀","🪞","🛋","🪥"],
  },
  {
    icono: "🚗",
    label: "Transporte",
    emojis: ["🚗","🚕","🚌","✈️","🚂","🚢","🛵","⛽","🚲","🏎","🚁","🛻","🚤","🛸","🚐","🚑","🚒","🏍","🛺","⛵"],
  },
  {
    icono: "🏃",
    label: "Salud",
    emojis: ["💊","🏋️","🏃","⚽","🎾","🧘","🏊","🥊","🏥","💉","🩺","🧗","🤸","🏄","🎯","🚴","🏇","🤾","🧬","🩻"],
  },
  {
    icono: "🏠",
    label: "Hogar",
    emojis: ["🏠","🛋","🪴","🧹","⚡","💡","🔧","🚿","🛏","📺","🧺","🏡","🔑","🪟","🧸","🪑","🪣","🪤","🪜","🔒"],
  },
  {
    icono: "🎬",
    label: "Ocio",
    emojis: ["🎬","🎮","🎵","🎸","🎭","📚","🎨","🎲","🎤","📷","🎧","🎪","🎡","🃏","🎰","🎻","🥁","🎠","🎟","🧩"],
  },
  {
    icono: "💼",
    label: "Trabajo",
    emojis: ["💼","💰","💳","📊","🏦","📝","💻","📱","📋","✏️","📌","🖊","📁","🔒","📈","🖥","🖨","📞","🗂","💡"],
  },
  {
    icono: "🌿",
    label: "Otros",
    emojis: ["🌿","🐶","🐱","🌍","🎓","🏖","🌴","🌺","🌊","⭐","🔥","❤️","🌙","☀️","🌈","🎉","🙏","💫","✨","🦋"],
  },
];

interface Props {
  valorActual: string;
  onSeleccionar: (emoji: string) => void;
}

export default function EmojiPicker({ valorActual, onSeleccionar }: Props) {
  const [categoriaActiva, setCategoriaActiva] = useState(0);

  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", backgroundColor: "var(--surface-2)" }}>
      {/* Tabs de categoría */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          gap: 2,
          padding: "6px 6px 0",
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
        className="no-scroll"
      >
        {CATEGORIAS_EMOJI.map((cat, idx) => (
          <button
            key={cat.label}
            onClick={() => setCategoriaActiva(idx)}
            title={cat.label}
            style={{
              flexShrink: 0,
              width: 36, height: 32,
              borderRadius: "8px 8px 0 0",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              backgroundColor: categoriaActiva === idx ? "var(--surface-2)" : "transparent",
              borderBottom: categoriaActiva === idx ? "2px solid #0F2F2F" : "2px solid transparent",
              transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {cat.icono}
          </button>
        ))}
      </div>

      {/* Grid de emojis */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 2,
          padding: 8,
          maxHeight: 160,
          overflowY: "auto",
        }}
        className="no-scroll"
      >
        {CATEGORIAS_EMOJI[categoriaActiva].emojis.map((emoji) => {
          const seleccionado = valorActual === emoji;
          return (
            <button
              key={emoji}
              onClick={() => onSeleccionar(emoji)}
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 8,
                border: seleccionado ? "1.5px solid #0F2F2F" : "1.5px solid transparent",
                backgroundColor: seleccionado ? "rgba(15,47,47,0.1)" : "transparent",
                fontSize: 20,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.1s",
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
