"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONOS = {
  home: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
      <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
    </svg>
  ),
  grafica: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75ZM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 0 1-1.875-1.875V8.625ZM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 0 1 3 19.875v-6.75Z" />
    </svg>
  ),
  archivo: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 0 0-3.182 0l-10.94 10.94a3.75 3.75 0 1 0 5.304 5.303l7.693-7.693a.75.75 0 0 1 1.06 1.06l-7.693 7.693a5.25 5.25 0 1 1-7.424-7.424l10.939-10.94a3.75 3.75 0 1 1 5.303 5.304L9.097 18.835l-.008.008-.007.007-.002.003-.003.002A2.25 2.25 0 0 1 5.91 15.66l7.81-7.81a.75.75 0 0 1 1.061 1.06l-7.81 7.81a.75.75 0 0 0 1.054 1.068L18.97 6.84a2.25 2.25 0 0 0 0-3.182Z" clipRule="evenodd" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
    </svg>
  ),
};

const NAVEGACION = [
  { href: "/dashboard", etiqueta: "Inicio",   icono: ICONOS.home },
  { href: "/estadisticas", etiqueta: "Gráficas", icono: ICONOS.grafica },
  { href: "/subir-archivo", etiqueta: "Archivos", icono: ICONOS.archivo },
  { href: "/chat",       etiqueta: "Chat IA",  icono: ICONOS.chat },
];

export default function NavBar() {
  const ruta = usePathname();

  return (
    <nav
      className="fixed bottom-5 left-4 right-4 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="flex items-center justify-around rounded-[2rem] px-2 py-2"
        style={{
          backgroundColor: "#100C28",
          boxShadow: "0 8px 40px rgba(16,12,40,0.5)",
        }}
      >
        {NAVEGACION.map(({ href, etiqueta, icono }) => {
          const activo = ruta === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-5 py-2.5 rounded-[1.5rem] transition-all active:scale-95"
              style={{
                backgroundColor: activo ? "#534AB7" : "transparent",
                color: activo ? "#FFFFFF" : "rgba(255,255,255,0.3)",
              }}
            >
              {icono}
              <span className="text-[9px] font-bold tracking-wide">
                {etiqueta}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
