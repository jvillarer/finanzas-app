"use client";

import Image from "next/image";

interface Props {
  onContinuar?: () => void;
}

export default function OnboardingStep1({ onContinuar }: Props) {
  return (
    /* ── Pantalla completa verde oscuro ── */
    <div className="fixed inset-0 flex flex-col bg-[#1B4332]">

      {/* ── Safe area top ── */}
      <div className="flex-shrink-0 h-safe-top" />

      {/* ── Card blanca ── */}
      <div className="flex-1 mx-4 mt-4 mb-0 bg-white rounded-[24px] flex flex-col overflow-hidden">

        {/* Paso */}
        <div className="pt-7 pb-0 flex justify-center">
          <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">
            1 / 6
          </span>
        </div>

        {/* Título y subtítulo */}
        <div className="px-7 pt-5 pb-4 flex flex-col items-center gap-2">
          <h1 className="text-[26px] font-bold text-gray-900 text-center leading-tight">
            ¡Hola! Soy Lani
          </h1>
          <p className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
            Estoy aquí para ayudarte a entender tu dinero, sin complicaciones.
          </p>
        </div>

        {/* ── Zona de imagen: ocupa el resto de la card ── */}
        <div className="flex-1 relative flex items-end justify-center overflow-hidden">

          {/* Blob verde claro */}
          <div
            className="absolute bottom-[-40px] w-[300px] h-[300px] rounded-full"
            style={{ backgroundColor: "#D1FAE5" }}
          />

          {/* Imagen con multiply para eliminar fondo negro */}
          <div
            className="relative z-10 mb-[-8px]"
            style={{ mixBlendMode: "multiply" }}
          >
            <Image
              src="/Lani_Saludando.png"
              alt="Lani saludando"
              width={290}
              height={290}
              className="object-contain w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]"
              priority
            />
          </div>
        </div>

        {/* ── Dots de paginación ── */}
        <div className="flex items-center justify-center gap-[6px] py-5">
          {/* Activo: pill ancho, verde oscuro */}
          <div className="w-[22px] h-[7px] rounded-full bg-[#1B4332]" />
          <div className="w-[7px] h-[7px] rounded-full bg-gray-200" />
          <div className="w-[7px] h-[7px] rounded-full bg-gray-200" />
        </div>
      </div>

      {/* ── Botón Continuar (fuera de la card) ── */}
      <div className="px-4 pt-3 pb-8 flex-shrink-0">
        <button
          onClick={onContinuar}
          className="
            w-full bg-white text-gray-900
            font-semibold text-base
            rounded-2xl py-[16px]
            shadow-[0_4px_24px_rgba(0,0,0,0.18)]
            active:scale-[0.97] transition-transform duration-100
          "
        >
          Continuar
        </button>
      </div>

    </div>
  );
}
