"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

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

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0c0c0e", display: "flex", flexDirection: "column", paddingBottom: 40 }}>

      {/* ── Hero ── */}
      <div style={{ padding: "64px 24px 36px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            🐑
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#eeebe4", letterSpacing: "-0.02em" }}>Lani</p>
            <p style={{ fontSize: 11, color: "#5c5c6c", fontWeight: 500 }}>Tu asistente financiera</p>
          </div>
        </div>

        <h1 style={{ fontSize: "clamp(32px, 9vw, 44px)", fontWeight: 800, color: "#eeebe4", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
          Entiende<br />tu dinero<br /><span style={{ color: "#c9a84c" }}>sin hojas de Excel</span>
        </h1>
        <p style={{ fontSize: 15, color: "#9494a2", lineHeight: 1.6, maxWidth: 340 }}>
          Habla con Lani, sube tu estado de cuenta y ten claridad total sobre a dónde se va tu dinero.
        </p>
      </div>

      {/* ── Balance preview ── */}
      <div style={{ margin: "0 24px 32px", padding: "20px", borderRadius: 20, backgroundColor: "#141417", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5c5c6c", marginBottom: 8 }}>
          Balance del mes
        </p>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 46, fontWeight: 400, fontStyle: "italic", color: "#eeebe4", letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 16 }}>
          $14,230
        </p>
        <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#3ecf8e" }}>+$22,000</p>
            <p style={{ fontSize: 10, color: "#5c5c6c", marginTop: 2 }}>Ingresos</p>
          </div>
          <div style={{ width: 1, backgroundColor: "rgba(255,255,255,0.04)", alignSelf: "stretch" }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#f06e6e" }}>−$7,770</p>
            <p style={{ fontSize: 10, color: "#5c5c6c", marginTop: 2 }}>Gastos</p>
          </div>
        </div>
        <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "#242428" }}>
          <div style={{ height: 3, borderRadius: 99, width: "35%", backgroundColor: "#c9a84c" }} />
        </div>
        <p style={{ fontSize: 10, color: "#5c5c6c", marginTop: 6 }}>Vas bien este mes · 35% gastado</p>

        {/* Lani insight */}
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12, backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🐑</span>
          <p style={{ fontSize: 11, color: "#9494a2", lineHeight: 1.5 }}>
            Gastas 40% más en Transporte los viernes. Considera Uber Pool o salir antes del rush.
          </p>
        </div>
      </div>

      {/* ── Features ── */}
      <div style={{ padding: "0 24px", marginBottom: 32 }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5c5c6c", marginBottom: 14 }}>
          Qué hace Lani
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FEATURES.map((f) => (
            <div key={f.titulo} style={{
              display: "flex", alignItems: "flex-start", gap: 14,
              padding: "14px 16px", borderRadius: 16,
              backgroundColor: "#141417", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#1c1c21", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {f.emoji}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#eeebe4", marginBottom: 3 }}>{f.titulo}</p>
                <p style={{ fontSize: 12, color: "#5c5c6c", lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat preview ── */}
      <div style={{ margin: "0 24px 32px", padding: "16px 18px", borderRadius: 20, backgroundColor: "#141417", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5c5c6c", marginBottom: 14 }}>
          Así se siente
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🐑</div>
            <div style={{ backgroundColor: "#1c1c21", borderRadius: "14px 14px 14px 4px", padding: "10px 14px", maxWidth: "80%" }}>
              <p style={{ fontSize: 12, color: "#eeebe4", fontWeight: 500 }}>Hola! Cuéntame un gasto o ingreso 👋</p>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ backgroundColor: "#c9a84c", borderRadius: "14px 14px 4px 14px", padding: "10px 14px", maxWidth: "80%" }}>
              <p style={{ fontSize: 12, color: "#0c0c0e", fontWeight: 600 }}>Gasté $500 en el súper</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🐑</div>
            <div style={{ backgroundColor: "#1c1c21", borderRadius: "14px 14px 14px 4px", padding: "10px 14px", maxWidth: "80%" }}>
              <p style={{ fontSize: 12, color: "#eeebe4", fontWeight: 500 }}>
                Listo ✓ <span style={{ color: "#3ecf8e", fontWeight: 700 }}>$500</span> en Supermercado. Llevas <span style={{ color: "#f06e6e" }}>$7,770</span> de gastos este mes.
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
          fontSize: 15, fontWeight: 700, color: "#0c0c0e",
          backgroundColor: "#c9a84c", textDecoration: "none",
          letterSpacing: "-0.01em",
        }}>
          Empezar gratis
        </Link>
        <Link href="/login" style={{
          display: "block", textAlign: "center",
          padding: "15px 0", borderRadius: 14,
          fontSize: 14, fontWeight: 600, color: "#9494a2",
          backgroundColor: "#141417", border: "1px solid rgba(255,255,255,0.06)",
          textDecoration: "none",
        }}>
          Ya tengo cuenta
        </Link>
        <p style={{ textAlign: "center", fontSize: 11, color: "#5c5c6c", marginTop: 4 }}>
          Gratis · Sin tarjeta · Datos seguros
        </p>
      </div>
    </main>
  );
}
