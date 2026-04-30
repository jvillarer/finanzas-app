"use client";
// Captura errores de renderizado de React y los reporta a Sentry
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          background: "#f9fafb",
          color: "#111",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 48, marginBottom: 8 }}>🐑</p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Algo salió mal
        </h2>
        <p style={{ color: "#6b7280", marginBottom: 24, maxWidth: 320 }}>
          Lani tuvo un problema. Ya lo estamos revisando.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 28px",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
