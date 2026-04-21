"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/dashboard",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 8.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V8.5" />
      </svg>
    ),
  },
  {
    href: "/chat",
    icon: (active: boolean) => (
      <img
        src="/lani-wave.png"
        alt="Lani"
        style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", opacity: active ? 1 : 0.35 }}
      />
    ),
  },
  {
    href: "/planificacion",
    // Capas apiladas — representa metas, presupuestos y proyectos
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: "/estadisticas",
    // Gráfica de barras — Analytics
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <rect x="3" y="12" width="4" height="9" rx="1" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.2 : 0} />
        <rect x="10" y="7" width="4" height="14" rx="1" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.2 : 0} />
        <rect x="17" y="3" width="4" height="18" rx="1" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.2 : 0} />
        <path d="M3 12h4M10 7h4M17 3h4" />
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
