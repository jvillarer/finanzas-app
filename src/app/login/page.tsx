"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [correo,     setCorreo]     = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando,   setCargando]   = useState(false);
  const [error,      setError]      = useState("");
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [resetEnviado,  setResetEnviado]  = useState(false);

  const handleOlvideContrasena = async () => {
    if (!correo) {
      setError("Escribe tu correo arriba y luego toca '¿Olvidaste tu contraseña?'");
      return;
    }
    setEnviandoReset(true);
    setError("");
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setEnviandoReset(false);
    setResetEnviado(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
    if (error) {
      setError("Correo o contraseña incorrectos");
      setCargando(false);
      return;
    }
    const yaVioOnboarding = localStorage.getItem("lani_onboarding_done");
    router.push(yaVioOnboarding ? "/dashboard" : "/bienvenida");
    router.refresh();
  };

  return (
    <main style={{
      position:    "fixed",
      inset:       0,
      background:  "#0F2F2F",
      display:     "flex",
      flexDirection: "column",
      overflow:    "hidden",
      fontFamily:  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    }}>

      {/* ── TOP 34% — Lani ─────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        height:     "34%",
        display:    "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        position:   "relative",
        overflow:   "hidden",
      }}>
        {/* Glow suave */}
        <div style={{
          position:     "absolute",
          width:        300,
          height:       300,
          borderRadius: "50%",
          background:   "radial-gradient(circle, rgba(207,232,232,0.07) 0%, transparent 70%)",
          bottom:       0,
          left:         "50%",
          transform:    "translateX(-50%)",
          pointerEvents: "none",
        }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Lani_login_crop.png"
          alt="Lani"
          style={{
            height:     "96%",
            width:      "auto",
            maxWidth:   "90%",
            objectFit:  "contain",
            display:    "block",
            filter:     "drop-shadow(0px 12px 24px rgba(0,0,0,0.3))",
          }}
        />
      </div>

      {/* ── Nombre y tagline ────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        paddingTop:    6,
        paddingBottom: 4,
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
      }}>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.5px", lineHeight: 1, margin: 0 }}>
          Lani
        </h1>
        <p style={{ fontSize: 13, color: "rgba(207,232,232,0.55)", marginTop: 4, letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 500 }}>
          Controla tu lana con Lani
        </p>
      </div>

      {/* ── BOTTOM — Formulario ─────────────────────────────────────────────── */}
      <form
        onSubmit={handleLogin}
        style={{
          flex:          1,
          padding:       "12px 24px 24px",
          display:       "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Correo */}
          <div style={{ background: "#ffffff", borderRadius: 16, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(15,47,47,0.55)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>
              Correo electrónico
            </div>
            <input
              type="email"
              autoComplete="email"
              placeholder="hola@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              style={{
                width: "100%", border: "none", outline: "none",
                background: "transparent", fontSize: 16, color: "#0F2F2F",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Contraseña */}
          <div style={{ background: "#ffffff", borderRadius: 16, padding: "14px 18px", display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(15,47,47,0.55)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>
                Contraseña
              </div>
              <input
                type={mostrarPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
                style={{
                  width: "100%", border: "none", outline: "none",
                  background: "transparent", fontSize: 16, color: "#0F2F2F",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setMostrarPass(!mostrarPass)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(15,47,47,0.45)" }}
            >
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

          <div style={{ textAlign: "right", marginTop: -4 }}>
            {resetEnviado ? (
              <span style={{ fontSize: 13, color: "rgba(130,220,130,0.85)" }}>
                ✓ Revisa tu correo para restablecer tu contraseña
              </span>
            ) : (
              <span
                onClick={handleOlvideContrasena}
                style={{ fontSize: 13, color: enviandoReset ? "rgba(207,232,232,0.35)" : "rgba(207,232,232,0.6)", cursor: enviandoReset ? "default" : "pointer" }}
              >
                {enviandoReset ? "Enviando…" : "¿Olvidaste tu contraseña?"}
              </span>
            )}
          </div>
        </div>

        {/* CTA + registro */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && (
            <div style={{ background: "rgba(217,74,74,0.15)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(217,74,74,0.3)" }}>
              <p style={{ fontSize: 13, color: "#ff6b6b", fontWeight: 600 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            style={{
              height:       56,
              borderRadius: 28,
              border:       "none",
              background:   cargando ? "rgba(255,255,255,0.7)" : "#ffffff",
              color:        "#0F2F2F",
              fontSize:     16,
              fontWeight:   700,
              width:        "100%",
              cursor:       cargando ? "default" : "pointer",
              boxShadow:    "0 6px 20px rgba(0,0,0,0.2)",
              transition:   "all 0.2s ease",
              letterSpacing: "0.1px",
            }}
          >
            {cargando ? "Entrando…" : "Iniciar sesión"}
          </button>

          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 14, color: "rgba(207,232,232,0.5)" }}>¿No tienes cuenta? </span>
            <Link href="/registro" style={{ fontSize: 14, color: "#ffffff", fontWeight: 600, textDecoration: "none" }}>
              ¡Regístrate!
            </Link>
          </div>
        </div>
      </form>
    </main>
  );
}
