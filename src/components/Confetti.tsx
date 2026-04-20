"use client";

import { useEffect, useRef, useState } from "react";

type Particula = {
  id: number;
  izquierda: number; // porcentaje
  color: string;
  duracion: number; // segundos
  retraso: number; // segundos
  rotacion: number; // grados iniciales
  ancho: number; // px
  alto: number; // px
};

const COLORES = [
  "var(--gold)",
  "#22c55e", // verde
  "#ef4444", // rojo
  "#3b82f6", // azul
  "#a855f7", // morado
  "#f59e0b", // ámbar
];

function generarParticulas(cantidad: number): Particula[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: i,
    izquierda: Math.random() * 100,
    color: COLORES[Math.floor(Math.random() * COLORES.length)],
    duracion: 1.5 + Math.random() * 1.5,
    retraso: Math.random() * 0.8,
    rotacion: Math.random() * 360,
    ancho: 6 + Math.floor(Math.random() * 6),
    alto: 10 + Math.floor(Math.random() * 6),
  }));
}

const PARTICULAS = generarParticulas(30);

const estiloKeyframes = `
@keyframes confeti-caida {
  0%   { transform: translateY(-20px) rotate(var(--rot-ini)) scaleX(1); opacity: 1; }
  50%  { transform: translateY(45vh) rotate(calc(var(--rot-ini) + 180deg)) scaleX(-1); opacity: 1; }
  100% { transform: translateY(105vh) rotate(calc(var(--rot-ini) + 360deg)) scaleX(1); opacity: 0; }
}
`;

type Props = {
  visible: boolean;
  onDone?: () => void;
};

export default function Confetti({ visible, onDone }: Props) {
  const [montado, setMontado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setMontado(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setMontado(false);
        onDone?.();
      }, 3000);
    } else {
      setMontado(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onDone]);

  if (!montado) return null;

  return (
    <>
      <style>{estiloKeyframes}</style>
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9999,
          overflow: "hidden",
        }}
      >
        {PARTICULAS.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              top: 0,
              left: `${p.izquierda}%`,
              width: p.ancho,
              height: p.alto,
              backgroundColor: p.color,
              borderRadius: 2,
              // @ts-expect-error custom CSS var
              "--rot-ini": `${p.rotacion}deg`,
              animation: `confeti-caida ${p.duracion}s ${p.retraso}s ease-in forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
}
