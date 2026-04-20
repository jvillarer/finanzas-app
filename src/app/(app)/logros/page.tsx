"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { obtenerTransacciones } from "@/lib/transacciones";
import {
  CATALOGO_LOGROS,
  calcularXP,
  obtenerNivel,
} from "@/lib/gamificacion";
import type { Transaccion } from "@/lib/supabase";

type LogroDesbloqueado = {
  logro_id: string;
  fecha_desbloqueado: string;
};

function Skel({ w, h, r = "8px" }: { w: string; h: string; r?: string }) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}

export default function LogrosPage() {
  const router = useRouter();
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [logrosDesbloqueados, setLogrosDesbloqueados] = useState<LogroDesbloqueado[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const [txs, logrosData] = await Promise.all([
          obtenerTransacciones(),
          supabase
            .from("logros_usuario")
            .select("logro_id, fecha_desbloqueado")
            .eq("usuario_id", user.id),
        ]);

        setTransacciones(txs);
        setLogrosDesbloqueados((logrosData.data as LogroDesbloqueado[]) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, [router]);

  const logrosIds = useMemo(
    () => logrosDesbloqueados.map((l) => l.logro_id),
    [logrosDesbloqueados]
  );

  const xpTotal = useMemo(
    () => calcularXP(transacciones, logrosIds),
    [transacciones, logrosIds]
  );

  const nivel = useMemo(() => obtenerNivel(xpTotal), [xpTotal]);

  const mapaFechas = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const l of logrosDesbloqueados) {
      mapa[l.logro_id] = l.fecha_desbloqueado;
    }
    return mapa;
  }, [logrosDesbloqueados]);

  const totalDesbloqueados = logrosIds.length;

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)", paddingBottom: 100 }}>
      {/* ── HEADER ── */}
      <div
        style={{
          padding: "56px 20px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="var(--text-2)"
            strokeWidth={1.8}
            strokeLinecap="round"
            style={{ width: 14, height: 14 }}
          >
            <path d="M12.5 15l-5-5 5-5" />
          </svg>
        </button>
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-1)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Mis logros
          </h1>
          {!cargando && (
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
              {totalDesbloqueados} de {CATALOGO_LOGROS.length} desbloqueados
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* ── CARD NIVEL Y XP ── */}
        {cargando ? (
          <Skel w="100%" h="120px" r="20px" />
        ) : (
          <div
            style={{
              padding: "20px",
              borderRadius: 20,
              backgroundColor: "var(--surface)",
              border: "1px solid var(--gold-border)",
              background:
                "linear-gradient(135deg, var(--surface) 0%, color-mix(in srgb, var(--gold-dim) 60%, var(--surface)) 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--gold)",
                    marginBottom: 4,
                  }}
                >
                  Nivel actual
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 28 }}>{nivel.emoji}</span>
                  <div>
                    <p
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text-1)",
                        lineHeight: 1.2,
                      }}
                    >
                      {nivel.label}
                    </p>
                    <p
                      className="font-number"
                      style={{
                        fontSize: 12,
                        color: "var(--gold)",
                        fontWeight: 700,
                        marginTop: 2,
                      }}
                    >
                      {xpTotal} XP
                    </p>
                  </div>
                </div>
              </div>
              {nivel.progreso < 100 && (
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 2 }}>
                    Siguiente nivel
                  </p>
                  <p
                    className="font-number"
                    style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600 }}
                  >
                    {nivel.xpSiguiente} XP
                  </p>
                </div>
              )}
            </div>

            {/* Barra de progreso */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <p style={{ fontSize: 10, color: "var(--text-3)" }}>
                  {nivel.progreso < 100 ? `${nivel.progreso}% al siguiente nivel` : "¡Nivel máximo!"}
                </p>
                {nivel.progreso < 100 && (
                  <p style={{ fontSize: 10, color: "var(--text-3)" }}>
                    {nivel.xpSiguiente - xpTotal} XP restantes
                  </p>
                )}
              </div>
              <div
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 99,
                  backgroundColor: "var(--surface-3)",
                }}
              >
                <div
                  style={{
                    height: 6,
                    borderRadius: 99,
                    width: `${nivel.progreso}%`,
                    backgroundColor: "var(--gold)",
                    transition: "width 1s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── GRID DE LOGROS ── */}
        {cargando ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Skel key={i} w="100%" h="130px" r="16px" />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {CATALOGO_LOGROS.map((logro) => {
              const desbloqueado = logrosIds.includes(logro.id);
              const fechaRaw = mapaFechas[logro.id];
              const fecha = fechaRaw
                ? new Date(fechaRaw).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null;

              return (
                <div
                  key={logro.id}
                  style={{
                    padding: "16px 14px",
                    borderRadius: 16,
                    backgroundColor: "var(--surface)",
                    border: desbloqueado
                      ? "1px solid var(--gold-border)"
                      : "1px solid var(--border)",
                    opacity: desbloqueado ? 1 : 0.35,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{logro.emoji}</span>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-1)",
                      lineHeight: 1.3,
                    }}
                  >
                    {logro.titulo}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--text-3)",
                      lineHeight: 1.4,
                      flex: 1,
                    }}
                  >
                    {desbloqueado ? logro.descripcion : "???"}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--gold)",
                        backgroundColor: "var(--gold-dim)",
                        padding: "2px 7px",
                        borderRadius: 99,
                        border: "1px solid var(--gold-border)",
                      }}
                    >
                      +{logro.xp} XP
                    </span>
                    {fecha && (
                      <p style={{ fontSize: 9, color: "var(--text-3)" }}>{fecha}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
