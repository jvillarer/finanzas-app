"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/dashboard",
    // Casa con techo redondeado y ventanita
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 8.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V8.5" />
      </svg>
    ),
  },
  {
    href: "/metas",
    // Bandera de meta (más aspiracional que target)
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M5 3v18" />
        <path d="M5 5h13l-3.5 4L18 13H5" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
  {
    href: "/presupuestos",
    // Cartera / wallet
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 14a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" stroke="none" />
        <path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2" />
      </svg>
    ),
  },
  {
    href: "/chat",
    // Lani 🐑 — se queda, es la identidad de la app
    icon: (active: boolean) => (
      <span style={{ fontSize: 20, lineHeight: 1, opacity: active ? 1 : 0.3 }}>🐑</span>
    ),
  },
  {
    href: "/proyectos",
    // Target / proyecto
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" fill={active ? "currentColor" : "none"} />
      </svg>
    ),
  },
];

export default function NavBar() {
  const ruta = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center"
      style={{
        backgroundColor: "var(--bg)",
        borderTop: "1px solid var(--border-2)",
        paddingBottom: "env(safe-area-inset-bottom)",
        height: 60,
      }}
    >
      {TABS.map(({ href, icon }) => {
        const activo = ruta === href || ruta.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex items-center justify-center h-full transition-opacity active:opacity-40"
          >
            <div
              className="transition-all duration-200"
              style={{ color: activo ? "var(--gold)" : "var(--text-3)" }}
            >
              {icon(activo)}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
