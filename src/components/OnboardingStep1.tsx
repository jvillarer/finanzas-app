"use client";

import Image from "next/image";

interface Props {
  onContinuar?: () => void;
}

export default function OnboardingStep1({ onContinuar }: Props) {
  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F5F5]">

      <div className="flex-shrink-0 h-safe-top" />

      <div className="flex-1 mx-4 mt-4 mb-0 bg-white rounded-[24px] flex flex-col overflow-hidden">

        <div className="pt-7 pb-0 flex justify-center">
          <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">
            1 / 6
          </span>
        </div>

        <div className="px-7 pt-5 pb-4 flex flex-col items-center gap-2">
          <h1 className="text-[26px] font-bold text-gray-900 text-center leading-tight">
            ¡Hola! Soy Lani
          </h1>
          <p className="text-sm text-gray-500 text-center leading-relaxed max-w-xs">
            Estoy aquí para ayudarte a entender tu dinero, sin complicaciones.
          </p>
        </div>

        {/* ── Zona de imagen ── */}
        <div className="flex-1 relative flex items-end justify-center overflow-hidden">

          {/* Blob verde claro agrandado */}
          <div
            className="absolute bottom-[-60px] w-[380px] h-[380px] rounded-full"
            style={{ backgroundColor: "#D1FAE5" }}
          />

          {/* Imagen transparente, sin blend mode */}
          <div className="relative z-10 mb-[-8px]">
            <Image
              src="/Lani_Saludando_transparent.png"
              alt="Lani saludando"
              width={340}
              height={340}
              className="object-contain w-[320px] h-[320px] sm:w-[360px] sm:h-[360px]"
              priority
            />
          </div>
        </div>

        {/* ── Dots de paginación ── */}
        <div className="flex items-center justify-center gap-[6px] py-5">
          <div className="w-[22px] h-[7px] rounded-full bg-[#1B4332]" />
          <div className="w-[7px] h-[7px] rounded-full bg-gray-200" />
          <div className="w-[7px] h-[7px] rounded-full bg-gray-200" />
        </div>
      </div>

      {/* ── Botón Continuar ── */}
      <div className="px-4 pt-3 pb-8 flex-shrink-0">
        <button
          onClick={onContinuar}
          className="
            w-full bg-[#1B4332] text-white
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
