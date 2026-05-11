"use client";

import { useState, useEffect } from "react";
import { crearTransaccion, crearTransaccionesMSI, formatearMonto } from "@/lib/transacciones";
import { haptico } from "@/lib/haptics";
import { obtenerTodasLasCategorias, crearCategoriaCustom, CATEGORIAS_INGRESO_DEFAULT } from "@/lib/categorias";
import EmojiPicker from "@/components/EmojiPicker";

const OPCIONES_MESES = [3, 6, 9, 12, 18, 24];

interface Props {
  onCerrar: () => void;
  onGuardado: () => void;
}

export default function NuevaTransaccion({ onCerrar, onGuardado }: Props) {
  // Bloquear scroll del body mientras el sheet está abierto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const [categoriasGasto, setCategoriasGasto] = useState<{ nombre: string; emoji: string }[]>([]);
  const [modalNuevaCat, setModalNuevaCat] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState("");
  const [nuevaCatEmoji, setNuevaCatEmoji] = useState("📦");
  const [guardandoCat, setGuardandoCat] = useState(false);

  useEffect(() => {
    obtenerTodasLasCategorias().then(setCategoriasGasto);
  }, []);

  const handleCrearCategoria = async () => {
    if (!nuevaCatNombre.trim()) return;
    setGuardandoCat(true);
    try {
      await crearCategoriaCustom(nuevaCatNombre, nuevaCatEmoji);
      const actualizadas = await obtenerTodasLasCategorias();
      setCategoriasGasto(actualizadas);
      setCategoria(nuevaCatNombre.trim());
      setModalNuevaCat(false);
      setNuevaCatNombre("");
      setNuevaCatEmoji("📦");
    } catch (e) { console.error(e); }
    finally { setGuardandoCat(false); }
  };

  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Meses sin intereses
  const [aMeses, setAMeses] = useState(false);
  const [numMeses, setNumMeses] = useState(12);

  const montoNum = Number(monto);
  const montoPorMes = aMeses && montoNum > 0 ? montoNum / numMeses : 0;

  const handleGuardar = async () => {
    if (!monto || isNaN(montoNum) || montoNum <= 0) { haptico.error(); setError("Ingresa un monto válido"); return; }
    if (!categoria) { haptico.error(); setError("Selecciona una categoría"); return; }
    const fechaDate = new Date(fecha + "T00:00:00");
    if (isNaN(fechaDate.getTime())) { haptico.error(); setError("Fecha inválida"); return; }
    // Solo validar fecha futura si NO es compra a meses
    if (!aMeses) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      if (fechaDate > hoy) { haptico.error(); setError("La fecha no puede ser futura"); return; }
    }
    if (fechaDate.getFullYear() < 2000) { haptico.error(); setError("Fecha demasiado antigua"); return; }
    haptico.medio();
    setGuardando(true); setError("");
    try {
      if (aMeses && tipo === "gasto") {
        await crearTransaccionesMSI({ monto: montoNum, descripcion, categoria, tipo, fecha }, numMeses);
      } else {
        await crearTransaccion({ monto: montoNum, descripcion, categoria, tipo, fecha });
      }
      haptico.exito();
      onGuardado();
    } catch (e: unknown) {
      haptico.error();
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const lbl = (txt: string) => (
    <label style={{ display: "block", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--text-3)", marginBottom: 8 }}>
      {txt}
    </label>
  );

  const textoBoton = () => {
    if (guardando) return aMeses ? `Guardando ${numMeses} cuotas...` : "Guardando...";
    if (aMeses && montoNum > 0) return `Guardar · ${numMeses} cuotas de ${formatearMonto(montoPorMes)}`;
    return "Guardar movimiento";
  };

  return (
    <div
      className="fixed inset-0 flex items-end"
      style={{ zIndex: 200, backgroundColor: "rgba(0,0,0,0.55)", touchAction: "none" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        className="w-full slide-up"
        style={{
          backgroundColor: "var(--surface)",
          borderTopLeftRadius: "24px",
          borderTopRightRadius: "24px",
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
          borderTop: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Zona fija: handle + header + tipo ── */}
        <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
          <div style={{ width: 32, height: 4, borderRadius: 99, backgroundColor: "var(--surface-3)", margin: "0 auto 20px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>Nuevo movimiento</h2>
            <button
              onClick={onCerrar}
              style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: "var(--surface-2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg viewBox="0 0 20 20" fill="var(--text-3)" style={{ width: 13, height: 13 }}>
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 16, padding: 3, borderRadius: 10, backgroundColor: "var(--surface-2)" }}>
            {(["gasto", "ingreso"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { haptico.ligero(); setTipo(t); setCategoria(""); if (t === "ingreso") setAMeses(false); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8,
                  fontSize: 13, fontWeight: 700,
                  backgroundColor: tipo === t ? "var(--bg)" : "transparent",
                  color: tipo === t ? (t === "ingreso" ? "var(--success)" : "var(--danger)") : "var(--text-3)",
                  border: tipo === t ? "1px solid var(--border)" : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {t === "ingreso" ? "↑ Ingreso" : "↓ Gasto"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Zona scrolleable ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 8px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>

          {/* Monto */}
          <div style={{ marginBottom: 16 }}>
            {lbl("Monto")}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 18, fontWeight: 700, color: "var(--text-3)" }}>$</span>
              <input
                type="number" inputMode="decimal" placeholder="0.00"
                value={monto} onChange={(e) => setMonto(e.target.value)}
                className="font-number"
                style={{
                  width: "100%", borderRadius: 12, paddingLeft: 34, paddingRight: 14, paddingTop: 14, paddingBottom: 14,
                  fontSize: 26, fontWeight: 800, outline: "none",
                  backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)",
                }}
              />
            </div>
          </div>

          {/* ── Meses sin intereses (solo gastos) ── */}
          {tipo === "gasto" && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 12,
                  backgroundColor: aMeses ? "rgba(15,47,47,0.06)" : "var(--surface-2)",
                  border: aMeses ? "1px solid rgba(15,47,47,0.18)" : "1px solid transparent",
                  cursor: "pointer",
                }}
                onClick={() => { haptico.ligero(); setAMeses((v) => !v); }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>💳</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", margin: 0 }}>Meses sin intereses</p>
                    {aMeses && montoNum > 0 && (
                      <p style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, margin: "2px 0 0" }}>
                        {numMeses} pagos de {formatearMonto(montoPorMes)}/mes
                      </p>
                    )}
                  </div>
                </div>
                {/* Toggle */}
                <div style={{
                  width: 44, height: 26, borderRadius: 13, position: "relative",
                  backgroundColor: aMeses ? "#0F2F2F" : "var(--surface-3)",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}>
                  <div style={{
                    position: "absolute", top: 3, left: aMeses ? 21 : 3,
                    width: 20, height: 20, borderRadius: "50%", backgroundColor: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    transition: "left 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                  }} />
                </div>
              </div>

              {/* Selector de meses */}
              {aMeses && (
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {OPCIONES_MESES.map((m) => (
                    <button
                      key={m}
                      onClick={() => { haptico.seleccion(); setNumMeses(m); }}
                      style={{
                        padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        backgroundColor: numMeses === m ? "#0F2F2F" : "var(--surface-2)",
                        color: numMeses === m ? "#fff" : "var(--text-2)",
                        border: numMeses === m ? "none" : "1px solid var(--border)",
                        transition: "all 0.15s",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                  <span style={{ alignSelf: "center", fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>meses</span>
                </div>
              )}
            </div>
          )}

          {/* Descripción */}
          <div style={{ marginBottom: 16 }}>
            {lbl("Descripción")}
            <input
              type="text" placeholder={tipo === "ingreso" ? "¿De dónde viene?" : "¿En qué gastaste?"}
              value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              style={{
                width: "100%", borderRadius: 12, padding: "12px 14px",
                fontSize: 14, fontWeight: 500, outline: "none",
                backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)",
              }}
            />
          </div>

          {/* Fecha — arriba de categoría para que el usuario la vea antes de scrollear */}
          <div style={{ marginBottom: 16 }}>
            {lbl(aMeses ? "Fecha primera cuota" : "Fecha")}
            <input
              type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              style={{
                width: "100%", borderRadius: 12, padding: "12px 14px",
                fontSize: 14, fontWeight: 500, outline: "none",
                backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)",
              }}
            />
            {aMeses && (
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6, fontWeight: 500 }}>
                La última cuota se registrará el mes {numMeses}
              </p>
            )}
          </div>

          {/* Categorías */}
          <div style={{ marginBottom: 16 }}>
            {lbl("Categoría")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {(tipo === "ingreso" ? CATEGORIAS_INGRESO_DEFAULT : categoriasGasto).map((cat) => {
                const activa = categoria === cat.nombre;
                return (
                  <button
                    key={cat.nombre}
                    onClick={() => { haptico.seleccion(); setCategoria(activa ? "" : cat.nombre); }}
                    className="active:scale-95 transition-transform"
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      padding: "9px 4px", borderRadius: 10,
                      backgroundColor: activa ? "rgba(15,47,47,0.08)" : "var(--surface-2)",
                      border: activa ? "1px solid rgba(15,47,47,0.2)" : "1px solid transparent",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    <span style={{ fontSize: 9, fontWeight: 600, color: activa ? "#0F2F2F" : "var(--text-3)" }}>
                      {cat.nombre.length > 6 ? cat.nombre.slice(0, 6) + "…" : cat.nombre}
                    </span>
                  </button>
                );
              })}
              {tipo === "gasto" && (
                <button
                  onClick={() => setModalNuevaCat(true)}
                  className="active:scale-95 transition-transform"
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "9px 4px", borderRadius: 10,
                    backgroundColor: "var(--surface-2)", border: "1px dashed var(--border)", cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 16 }}>➕</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-3)" }}>Nueva</span>
                </button>
              )}
            </div>
          </div>

          {/* Modal nueva categoría */}
          {modalNuevaCat && (
            <div className="fixed inset-0 flex items-end" style={{ zIndex: 300, backgroundColor: "rgba(0,0,0,0.6)" }}
              onClick={(e) => { if (e.target === e.currentTarget) setModalNuevaCat(false); }}>
              <div className="w-full slide-up" style={{ backgroundColor: "var(--surface)", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "20px 20px", paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)", borderTop: "1px solid var(--border)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 14 }}>Nueva categoría</p>
                <input
                  type="text" placeholder="Nombre (ej. Mascotas)" value={nuevaCatNombre}
                  onChange={(e) => setNuevaCatNombre(e.target.value)}
                  autoFocus autoComplete="off" autoCorrect="off" autoCapitalize="words" spellCheck={false}
                  style={{ width: "100%", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 600, backgroundColor: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-1)", outline: "none", marginBottom: 12 }}
                />
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>Ícono</p>
                <div style={{ marginBottom: 14 }}>
                  <EmojiPicker valorActual={nuevaCatEmoji} onSeleccionar={setNuevaCatEmoji} />
                </div>
                <button
                  onClick={handleCrearCategoria}
                  disabled={guardandoCat || !nuevaCatNombre.trim()}
                  style={{ width: "100%", padding: "13px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: "#0F2F2F", color: "#fff", border: "none", cursor: "pointer", opacity: (!nuevaCatNombre.trim() || guardandoCat) ? 0.4 : 1 }}
                >
                  {guardandoCat ? "Guardando..." : "Crear categoría"}
                </button>
              </div>
            </div>
          )}


        </div>{/* fin zona scrolleable */}

        {/* ── Footer fijo ── */}
        <div style={{ padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))", flexShrink: 0, borderTop: "1px solid var(--border-2)" }}>
          {error && (
            <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>{error}</p>
            </div>
          )}
          <button
            onClick={handleGuardar} disabled={guardando}
            className="active:scale-[0.98] transition-transform"
            style={{
              width: "100%", fontWeight: 700, padding: "15px 0", borderRadius: 14,
              fontSize: aMeses && montoNum > 0 ? 13 : 15,
              backgroundColor: "#0F2F2F", color: "#ffffff",
              border: "none", cursor: "pointer", opacity: guardando ? 0.5 : 1,
            }}
          >
            {textoBoton()}
          </button>
        </div>
      </div>
    </div>
  );
}
