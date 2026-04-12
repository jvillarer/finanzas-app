"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "none" : "none"} stroke={active ? "#1f6b4e" : "#a1a1aa"} strokeWidth={active ? 2 : 1.6} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/presupuestos",
    label: "Límites",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#1f6b4e" : "#a1a1aa"} strokeWidth={active ? 2 : 1.6} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/subir-archivo",
    label: "Subir",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#1f6b4e" : "#a1a1aa"} strokeWidth={active ? 2 : 1.6} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Lani",
    icon: (active: boolean) => (
      <span className="text-lg leading-none transition-all" style={{ filter: active ? "none" : "grayscale(1) opacity(0.35)", transform: active ? "scale(1.1)" : "scale(1)" }}>🐑</span>
    ),
  },
  {
    href: "/estadisticas",
    label: "Gráficas",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={active ? "#1f6b4e" : "#a1a1aa"} strokeWidth={active ? 2 : 1.6} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

export default function NavBar() {
  const ruta = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-white"
      style={{
        borderTop: "1px solid rgba(0,0,0,0.05)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
      }}
    >
      {TABS.map(({ href, label, icon }) => {
        const activo = ruta === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-end gap-1 pt-3 pb-2 transition-all active:opacity-60"
          >
            {/* Pill indicator */}
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width: activo ? 20 : 0,
                height: 2,
                marginBottom: 4,
                backgroundColor: activo ? "#1f6b4e" : "transparent",
                transform: activo ? "scaleX(1)" : "scaleX(0)",
              }}
            />
            <div className="flex items-center justify-center w-6 h-6">
              {icon(activo)}
            </div>
            <span
              className="text-[9px] font-bold tracking-wide transition-colors"
              style={{ color: activo ? "#1f6b4e" : "#a1a1aa" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
