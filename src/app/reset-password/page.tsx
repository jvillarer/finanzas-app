"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [contrasena,    setContrasena]    = useState("");
  const [confirmar,     setConfirmar]     = useState("");
  const [mostrarPass,   setMostrarPass]   = useState(false);
  const [guardando,     setGuardando]     = useState(false);
  const [error,         setError]         = useState("");
  const [listo,         setListo]         = useState(false);
  const [tokenValido,   setTokenValido]   = useState(false);

  // Supabase maneja el token OTP del link automáticamente al montar
  useEffect(() => {
    const supabase = createClient();
    // Escuchar el evento PASSWORD_RECOVERY que Supabase dispara
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setTokenValido(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (contrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (contrasena !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setGuardando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    if (error) {
      setError("No se pudo actualizar la contraseña. El link puede haber expirado.");
      setGuardando(false);
      return;
    }
    setListo(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  };

  if (listo) {
    return (
      <main style={{
        position: "fixed", inset: 0, background: "#0F2F2F",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 16, padding: "0 32px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Lani_cropped.png" alt="Lani" style={{ height: 160, objectFit: "contain", filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.3))" }} />
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>¡Contraseña actualizada!</h2>
          <p style={{ color: "rgba(207,232,232,0.6)", fontSize: 14 }}>Entrando a tu cuenta…</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      position: "fixed", inset: 0, background: "#0F2F2F",
      display: "flex", flexDirection: "column",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    }}>
      {/* TOP — Lani */}
      <div style={{
        flexShrink: 0, height: "40%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(207,232,232,0.07) 0%, transparent 70%)",
          bottom: 0, left: "50%", transform: "translateX(-50%)", pointerEvents: "none",
        }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Lani_cropped.png" alt="Lani" style={{
          height: "96%", width: "auto", maxWidth: "90%",
          objectFit: "contain", display: "block",
          filter: "drop-shadow(0px 12px 24px rgba(0,0,0,0.3))",
        }} />
      </div>

      {/* Título */}
      <div style={{ flexShrink: 0, paddingTop: 10, paddingBottom: 6, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px", lineHeight: 1, margin: 0 }}>
          Nueva contraseña
        </h1>
        <p style={{ fontSize: 13, color: "rgba(207,232,232,0.5)", marginTop: 5 }}>
          {tokenValido ? "Elige una contraseña segura" : "Cargando…"}
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleGuardar} style={{
        flex: 1, padding: "20px 24px 40px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Nueva contraseña */}
          <div style={{ background: "#ffffff", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(15,47,47,0.55)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>
                Nueva contraseña
              </div>
              <input
                type={mostrarPass ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 16, color: "#0F2F2F", fontFamily: "inherit" }}
              />
            </div>
            <button type="button" onClick={() => setMostrarPass(!mostrarPass)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(15,47,47,0.45)" }}>
              {mostrarPass ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {/* Confirmar */}
          <div style={{ background: "#ffffff", borderRadius: 16, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(15,47,47,0.55)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>
              Confirmar contraseña
            </div>
            <input
              type={mostrarPass ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 16, color: "#0F2F2F", fontFamily: "inherit" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div style={{ background: "rgba(217,74,74,0.15)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(217,74,74,0.3)" }}>
              <p style={{ fontSize: 13, color: "#ff6b6b", fontWeight: 600 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={guardando || !tokenValido}
            style={{
              height: 56, borderRadius: 28, border: "none",
              background: (guardando || !tokenValido) ? "rgba(255,255,255,0.7)" : "#ffffff",
              color: "#0F2F2F", fontSize: 16, fontWeight: 700, width: "100%",
              cursor: (guardando || !tokenValido) ? "default" : "pointer",
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)", transition: "all 0.2s ease",
            }}
          >
            {guardando ? "Guardando…" : "Guardar contraseña"}
          </button>
        </div>
      </form>
    </main>
  );
}
