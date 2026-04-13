"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const SLIDES = [
  {
    titulo: "Habla con Lani",
    descripcion: "Di \"Gasté $200 en comida\" o toma foto de un ticket. Lani registra, categoriza y suma — sin formularios.",
    visual: <SlideChat />,
  },
  {
    titulo: "Importa tu banco",
    descripcion: "Sube el PDF de tu estado de cuenta. Lani extrae todas las transacciones y las categoriza automáticamente.",
    visual: <SlideImportar />,
  },
  {
    titulo: "Metas y presupuestos",
    descripcion: "Define cuánto gastar por categoría y crea metas de ahorro. Lani te avisa cuando te acercas al límite.",
    visual: <SlidePresupuestos />,
  },
  {
    titulo: "Todo en un vistazo",
    descripcion: "Balance del mes, proyección al fin de mes, suscripciones que quizás olvidaste y análisis semanal de Lani.",
    visual: <SlideDashboard />,
  },
];

function SlideChat() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10, padding: 20 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🐑</div>
        <div style={{ backgroundColor: "#1c1c21", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", maxWidth: "78%", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 12, color: "#eeebe4", fontWeight: 500 }}>Hola! Cuéntame un gasto o mándame foto de un ticket 👋</p>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ backgroundColor: "#c9a84c", borderRadius: "12px 12px 4px 12px", padding: "10px 14px", maxWidth: "78%" }}>
          <p style={{ fontSize: 12, color: "#0c0c0e", fontWeight: 600 }}>Gasté $350 en gasolina</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🐑</div>
        <div style={{ backgroundColor: "#1c1c21", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", maxWidth: "78%", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 12, color: "#eeebe4", fontWeight: 500 }}>Listo ✓ <span style={{ color: "#3ecf8e", fontWeight: 700 }}>$350</span> en Transporte. Llevas <span style={{ color: "#c9a84c" }}>$1,820</span> en gasolina este mes.</p>
        </div>
      </div>
      {/* Mic button hint */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 99, backgroundColor: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.22)" }}>
          <span style={{ fontSize: 14 }}>🎙️</span>
          <p style={{ fontSize: 11, color: "#c9a84c", fontWeight: 600 }}>También puedes hablarle</p>
        </div>
      </div>
    </div>
  );
}

function SlideImportar() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 20 }}>
      {/* PDF card */}
      <div style={{ width: "100%", padding: "16px", borderRadius: 16, backgroundColor: "#1c1c21", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📄</div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#eeebe4" }}>BBVA_Enero_2026.pdf</p>
            <p style={{ fontSize: 10, color: "#5c5c6c" }}>Estado de cuenta · 2.3 MB</p>
          </div>
        </div>
        {/* Progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: "#242428" }}>
            <div style={{ height: 3, borderRadius: 99, width: "100%", backgroundColor: "#3ecf8e" }} />
          </div>
          <p style={{ fontSize: 10, color: "#3ecf8e", fontWeight: 700, flexShrink: 0 }}>✓ Listo</p>
        </div>
      </div>
      {/* Results */}
      {[
        { desc: "Uber · Transporte", monto: "-$280", color: "#eeebe4" },
        { desc: "Netflix · Entretenimiento", monto: "-$219", color: "#eeebe4" },
        { desc: "Nómina · Ingreso", monto: "+$18,000", color: "#3ecf8e" },
        { desc: "CFE · Servicios", monto: "-$640", color: "#eeebe4" },
      ].map((r, i) => (
        <div key={i} style={{ width: "100%", display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 10, backgroundColor: "#1c1c21", border: "1px solid rgba(255,255,255,0.04)" }}>
          <p style={{ fontSize: 11, color: "#9494a2" }}>{r.desc}</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: r.color }}>{r.monto}</p>
        </div>
      ))}
      <p style={{ fontSize: 10, color: "#5c5c6c", textAlign: "center" }}>47 transacciones detectadas</p>
    </div>
  );
}

function SlidePresupuestos() {
  const cats = [
    { nombre: "Comida", gastado: 1800, limite: 3000, color: "#3ecf8e" },
    { nombre: "Transporte", gastado: 2200, limite: 2500, color: "#e8a838" },
    { nombre: "Entretenimiento", gastado: 1100, limite: 800, color: "#f06e6e" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, padding: 20 }}>
      {cats.map((c) => {
        const pct = Math.min((c.gastado / c.limite) * 100, 100);
        const pasado = c.gastado > c.limite;
        return (
          <div key={c.nombre} style={{ padding: "14px", borderRadius: 14, backgroundColor: "#1c1c21", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#eeebe4" }}>{c.nombre}</p>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: c.color }}>{pct.toFixed(0)}%</p>
                {pasado && <p style={{ fontSize: 9, fontWeight: 700, color: "#f06e6e" }}>Excedido</p>}
              </div>
            </div>
            <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "#242428" }}>
              <div style={{ height: 3, borderRadius: 99, width: `${pct}%`, backgroundColor: c.color }} />
            </div>
            <p style={{ fontSize: 10, color: "#5c5c6c", marginTop: 6 }}>${c.gastado.toLocaleString()} de ${c.limite.toLocaleString()}</p>
          </div>
        );
      })}
      {/* Meta */}
      <div style={{ padding: "12px 14px", borderRadius: 14, backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>✈️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#eeebe4" }}>Vacaciones Europa</p>
            <div style={{ width: "100%", height: 3, borderRadius: 99, backgroundColor: "#242428", marginTop: 6 }}>
              <div style={{ height: 3, borderRadius: 99, width: "42%", backgroundColor: "#c9a84c" }} />
            </div>
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#c9a84c" }}>42%</p>
        </div>
      </div>
    </div>
  );
}

function SlideDashboard() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 10, padding: 20 }}>
      {/* Balance */}
      <div style={{ padding: "14px", borderRadius: 14, backgroundColor: "#1c1c21", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5c5c6c", marginBottom: 4 }}>Balance · Abril</p>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 32, fontStyle: "italic", fontWeight: 400, color: "#eeebe4", lineHeight: 1 }}>$14,230</p>
        <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#3ecf8e" }}>+$22,000</p>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#f06e6e" }}>−$7,770</p>
        </div>
      </div>
      {/* Proyección */}
      <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: "#1c1c21", border: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5c5c6c", marginBottom: 3 }}>Proyección 30 abr</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#3ecf8e" }}>~$11,400</p>
        </div>
        <p style={{ fontSize: 10, color: "#5c5c6c" }}>18 días restantes</p>
      </div>
      {/* Insight */}
      <div style={{ padding: "10px 12px", borderRadius: 12, backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.18)", display: "flex", gap: 8 }}>
        <span style={{ fontSize: 13, flexShrink: 0 }}>🐑</span>
        <p style={{ fontSize: 11, color: "#9494a2", lineHeight: 1.5 }}>Tus suscripciones suman $1,200/mes. Considera revisar cuáles usas realmente.</p>
      </div>
    </div>
  );
}

export default function BienvenidaPage() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const n = user.user_metadata?.nombre_completo || "";
      setNombre(n.split(" ")[0] || "");
    })();
  }, [router]);

  const siguiente = () => {
    if (paso < SLIDES.length - 1) {
      setPaso((p) => p + 1);
    } else {
      localStorage.setItem("lani_onboarding_done", "1");
      router.replace("/dashboard");
    }
  };

  const saltar = () => {
    localStorage.setItem("lani_onboarding_done", "1");
    router.replace("/dashboard");
  };

  const slide = SLIDES[paso];
  const esUltimo = paso === SLIDES.length - 1;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0c0c0e", display: "flex", flexDirection: "column" }}>

      {/* Dots + skip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "56px 24px 0" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5, borderRadius: 99,
                width: i === paso ? 20 : 5,
                backgroundColor: i === paso ? "#c9a84c" : "#242428",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
        {!esUltimo && (
          <button onClick={saltar} style={{ fontSize: 13, fontWeight: 600, color: "#5c5c6c", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Saltar
          </button>
        )}
      </div>

      {/* Visual */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px" }}>
        <div style={{
          width: "100%", maxWidth: 360,
          borderRadius: 24, overflow: "hidden",
          backgroundColor: "#141417",
          border: "1px solid rgba(255,255,255,0.08)",
          minHeight: 300,
        }}>
          {slide.visual}
        </div>
      </div>

      {/* Texto + CTA */}
      <div style={{ padding: "0 24px 48px" }}>
        {/* Saludo en último slide */}
        {esUltimo && nombre && (
          <p style={{ fontSize: 13, fontWeight: 600, color: "#c9a84c", marginBottom: 6 }}>
            ¡Hola, {nombre}! 🐑
          </p>
        )}
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#eeebe4", letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: 10 }}>
          {slide.titulo}
        </h2>
        <p style={{ fontSize: 14, color: "#9494a2", lineHeight: 1.6, marginBottom: 28 }}>
          {slide.descripcion}
        </p>

        <button
          onClick={siguiente}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 14,
            fontSize: 15, fontWeight: 700, color: "#0c0c0e",
            backgroundColor: "#c9a84c", border: "none", cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          {esUltimo ? (nombre ? `Entrar, ${nombre}` : "Entrar al dashboard") : "Continuar"}
        </button>
      </div>
    </main>
  );
}
