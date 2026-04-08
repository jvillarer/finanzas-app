"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAVEGACION = [
  { href: "/dashboard", etiqueta: "Inicio", icono: "🏠" },
  { href: "/estadisticas", etiqueta: "Gráficas", icono: "📊" },
  { href: "/subir-archivo", etiqueta: "Archivos", icono: "📁" },
  { href: "/chat", etiqueta: "Chat IA", icono: "💬" },
];

export default function NavBar() {
  const ruta = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around px-4 pb-safe z-40">
      {NAVEGACION.map(({ href, etiqueta, icono }) => {
        const activo = ruta === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 py-3 px-5 transition-colors ${
              activo ? "text-primary-500" : "text-gray-400"
            }`}
          >
            <span className="text-2xl leading-none">{icono}</span>
            <span className={`text-xs font-medium ${activo ? "text-primary-500" : "text-gray-400"}`}>
              {etiqueta}
            </span>
            {activo && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-primary-500 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
