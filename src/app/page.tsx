"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import OnboardingStep1 from "@/components/OnboardingStep1";

const FEATURES = [
  {
    emoji: "🐑",
    titulo: "Solo díselo",
    desc: "\"Gasté $300 en Uber\" y listo. Lani lo registra, categoriza y suma al instante.",
  },
  {
    emoji: "📄",
    titulo: "Importa tu banco",
    desc: "Sube tu estado de cuenta en PDF y Lani extrae todas las transacciones automáticamente.",
  },
  {
    emoji: "📸",
    titulo: "Foto de ticket",
    desc: "Toma foto de cualquier recibo. Lani lee cada artículo y lo registra por separado.",
  },
  {
    emoji: "🎯",
    titulo: "Metas de ahorro",
    desc: "Define a dónde va tu dinero: carro, viaje, fondo de emergencia. Ve tu progreso cada día.",
  },
  {
    emoji: "📊",
    titulo: "Proyección fin de mes",
    desc: "Lani proyecta cuánto vas a terminar según cómo llevas gastando. Sin sorpresas.",
  },
  {
    emoji: "🔁",
    titulo: "Detecta suscripciones",
    desc: "Descubre cuánto gastas en pagos recurrentes que ya ni recuerdas que tienes.",
  },
];

// Tokens de diseño — misma paleta que el onboarding
const BG      = "#F5F3EE";
const SURFACE = "#FFFFFF";
const SURFACE2 = "#F8F6F1";
const TEXT1   = "#0E0E10";
const TEXT2   = "rgba(14,14,16,0.56)";
const TEXT3   = "rgba(14,14,16,0.38)";
const ACCENT  = "#2F8F87";
const SUCCESS = "#1F9D55";
const DANGER  = "#D94A4A";
const BORDER  = "rgba(14,14,16,0.09)";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/dashboard");
    };
    checkSession();
  }, [router]);

  // ── TEMPORAL: mostrar OnboardingStep1 para revisión de diseño ──
  return <OnboardingStep1 onContinuar={() => {}} />;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: BG, display: "flex", flexDirection: "column", paddingBottom: 48 }}>

      {/* ── Hero ── */}
      <div style={{ padding: "64px 24px 36px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, overflow: "hidden" }}>
            <img src="/lani-hi.png" alt="Lani" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: TEXT1, letterSpacing: "-0.02em" }}>Lani</p>
            <p style={{ fontSize: 11, color: TEXT3, fontWeight: 500 }}>Tu asistente financiera</p>
          </div>
        </div>

        <h1 style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: "clamp(34px, 9vw, 48px)",
          fontWeight: 400,
          color: TEXT1,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          marginBottom: 16,
        }}>
          Entiende<br />tu dinero<br /><span style={{ color: ACCENT }}>sin hojas de Excel.</span>
        </h1>
        <p style={{ fontSize: 15, color: TEXT2, lineHeight: 1.65, maxWidth: 340 }}>
          Habla con Lani, sube tu estado de cuenta y ten claridad total sobre a dónde se va tu dinero.
        </p>
      </div>

      {/* ── Balance preview ── */}
      <div style={{
        margin: "0 24px 28px", padding: "20px", borderRadius: 20,
        backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT3, marginBottom: 6 }}>
          Balance · Abril &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MXN
        </p>
        <p style={{
          fontFamily: "var(--font-display), Georgia, serif",
          fontSize: 46, fontWeight: 400,
          color: TEXT1, letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 16,
        }}>
          $14,230
        </p>
        <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: SUCCESS }}>+$22,000</p>
            <p style={{ fontSize: 10, color: TEXT3, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Ingresos</p>
          </div>
          <div style={{ width: 1, backgroundColor: BORDER, alignSelf: "stretch" }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: DANGER }}>−$7,770</p>
            <p style={{ fontSize: 10, color: TEXT3, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>Gastos</p>
          </div>
        </div>
        <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: SURFACE2 }}>
          <div style={{ height: 3, borderRadius: 99, width: "35%", backgroundColor: ACCENT }} />
        </div>
        <p style={{ fontSize: 10, color: TEXT3, marginTop: 6 }}>Vas bien este mes · 35% gastado</p>

        {/* Proyección */}
        <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, backgroundColor: SURFACE2, border: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT3, marginBottom: 4 }}>
                Proyección · 30 Abr
              </p>
              <p style={{ fontFamily: "var(--font-display), Georgia, serif", fontSize: 22, color: SUCCESS, fontWeight: 400 }}>~$11,400</p>
            </div>
            <p style={{ fontSize: 11, color: TEXT3, textAlign: "right", lineHeight: 1.5 }}>18 días<br />restantes</p>
          </div>
        </div>

        {/* Lani insight */}
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
            <img src="/lani-hi.png" alt="Lani" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: ACCENT, marginBottom: 3 }}>● LANI REVISÓ TU MES</p>
            <p style={{ fontSize: 12, color: TEXT2, lineHeight: 1.5 }}>
              Tus suscripciones suman $1,200/mes. Vale la pena revisar cuáles usas.
            </p>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ padding: "0 24px", marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT3, marginBottom: 14 }}>
          Qué hace Lani
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {FEATURES.map((f) => (
            <div key={f.titulo} style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              padding: "14px 16px", borderRadius: 16,
              backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: SURFACE2,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>
                {f.emoji}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: TEXT1, marginBottom: 3 }}>{f.titulo}</p>
                <p style={{ fontSize: 12, color: TEXT2, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat preview ── */}
      <div style={{
        margin: "0 24px 28px", padding: "16px 18px", borderRadius: 20,
        backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT3, marginBottom: 14 }}>
          Así se siente
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
            <img src="/lani-hi.png" alt="Lani" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
            <div style={{ backgroundColor: SURFACE2, borderRadius: "14px 14px 14px 4px", padding: "10px 14px", maxWidth: "80%", border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 12, color: TEXT1, fontWeight: 500 }}>Hola! Cuéntame un gasto o ingreso 👋</p>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ backgroundColor: TEXT1, borderRadius: "14px 14px 4px 14px", padding: "10px 14px", maxWidth: "80%" }}>
              <p style={{ fontSize: 12, color: "#ffffff", fontWeight: 600 }}>Gasté $500 en el súper</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
            <img src="/lani-hi.png" alt="Lani" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
            <div style={{ backgroundColor: SURFACE2, borderRadius: "14px 14px 14px 4px", padding: "10px 14px", maxWidth: "80%", border: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 12, color: TEXT1, fontWeight: 500 }}>
                Listo ✓ <span style={{ color: SUCCESS, fontWeight: 700 }}>$500</span> en Supermercado. Llevas <span style={{ color: DANGER }}>$7,770</span> de gastos este mes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTAs ── */}
      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <Link href="/registro" style={{
          display: "block", textAlign: "center",
          padding: "16px 0", borderRadius: 14,
          fontSize: 15, fontWeight: 700, color: "#ffffff",
          backgroundColor: TEXT1, textDecoration: "none",
          letterSpacing: "-0.01em",
        }}>
          Empezar gratis
        </Link>
        <Link href="/login" style={{
          display: "block", textAlign: "center",
          padding: "15px 0", borderRadius: 14,
          fontSize: 14, fontWeight: 600, color: TEXT2,
          backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
          textDecoration: "none",
        }}>
          Ya tengo cuenta
        </Link>
        <p style={{ textAlign: "center", fontSize: 11, color: TEXT3, marginTop: 4 }}>
          Gratis · Sin tarjeta · Datos seguros
        </p>
      </div>
    </main>
  );
}
