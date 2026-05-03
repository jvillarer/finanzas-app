"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NuevaTransaccion from "@/components/NuevaTransaccion";

const TABS_IZQ = [
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
];

const TABS_DER = [
  {
    href: "/planificacion",
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
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const handleGuardado = () => {
    setAbierto(false);
    // Refrescar la página actual para que se vea la nueva transacción
    router.refresh();
  };

  return (
    <>
      {/* Modal nueva transacción */}
      {abierto && (
        <NuevaTransaccion
          onCerrar={() => setAbierto(false)}
          onGuardado={handleGuardado}
        />
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center"
        style={{
          backgroundColor: "var(--bg)",
          borderTop: "1px solid var(--border-2)",
          paddingBottom: "env(safe-area-inset-bottom)",
          height: 64,
        }}
      >
        {/* Tabs izquierda */}
        {TABS_IZQ.map(({ href, icon }) => {
          const activo = ruta === href || ruta.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex items-center justify-center h-full transition-opacity active:opacity-40"
            >
              <div style={{ color: activo ? "var(--gold)" : "var(--text-3)" }}>
                {icon(activo)}
              </div>
            </Link>
          );
        })}

        {/* Botón + central */}
        <div className="flex-1 flex items-center justify-center" style={{ position: "relative" }}>
          <button
            onClick={() => setAbierto(true)}
            className="active:scale-90 transition-transform"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#0F2F2F",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(15,47,47,0.35), 0 1px 4px rgba(0,0,0,0.15)",
              position: "relative",
              bottom: 10,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" style={{ width: 24, height: 24 }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Tabs derecha */}
        {TABS_DER.map(({ href, icon }) => {
          const activo = ruta === href || ruta.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex items-center justify-center h-full transition-opacity active:opacity-40"
            >
              <div style={{ color: activo ? "var(--gold)" : "var(--text-3)" }}>
                {icon(activo)}
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
