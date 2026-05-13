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
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 1 : 1.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        {/* Sparkle / estrella — representa "conoce a Lani" */}
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fillOpacity={active ? 0.85 : 0} />
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
    // Notificar a todos los componentes que hay una nueva transacción
    window.dispatchEvent(new CustomEvent("lani:transaccion-guardada"));
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
