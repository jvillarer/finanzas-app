"use client";

import Image from "next/image";

interface Props {
  onContinuar?: () => void;
}

export default function OnboardingStep1({ onContinuar }: Props) {
  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F5F5]">

      <div className="flex-shrink-0 h-safe-top" />

      {/* ── Card blanca ── */}
      <div className="flex-1 mx-4 mt-4 mb-0 bg-white rounded-[24px] flex flex-col overflow-hidden">

        {/* Paso */}
        <div className="pt-6 pb-0 flex justify-center">
          <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">
            1 / 6
          </span>
        </div>

        {/* Título y subtítulo — menos padding abajo para reducir espacio vacío */}
        <div className="px-7 pt-4 pb-2 flex flex-col items-center gap-1">
          <h1 className="text-[26px] font-bold text-gray-900 text-center leading-tight">
            ¡Hola! Soy Lani
          </h1>
          <p className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
            Estoy aquí para ayudarte a entender tu dinero, sin complicaciones.
          </p>
        </div>

        {/* ── Zona de imagen: ocupa el resto de la card ── */}
        <div className="flex-1 relative flex items-end justify-center overflow-hidden">

          {/* Blob verde — más ancho que el borrego */}
          <div
            className="absolute bottom-[-80px] w-[420px] h-[420px] rounded-full"
            style={{ backgroundColor: "#D1FAE5" }}
          />

          {/* Borrego — sin mix-blend-mode, ocupa casi todo el ancho */}
          <div className="relative z-10 mb-[-12px]">
            <Image
              src="/Lani_Saludando_transparent.png"
              alt="Lani saludando"
              width={360}
              height={360}
              className="object-contain w-[320px] h-[320px] sm:w-[360px] sm:h-[360px]"
              priority
            />
          </div>
        </div>

        {/* ── Dots de paginación ── */}
        <div className="flex items-center justify-center gap-[6px] py-4">
          <div className="w-[22px] h-[7px] rounded-full bg-[#1B4332]" />
          <div className="w-[7px] h-[7px] rounded-full bg-gray-200" />
          <div className="w-[7px] h-[7px] rounded-full bg-gray-200" />
        </div>
      </div>

      {/* ── Botón Continuar — blanco con texto oscuro ── */}
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
