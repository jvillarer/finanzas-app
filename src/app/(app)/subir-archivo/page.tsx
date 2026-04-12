"use client";

import { useState, useRef } from "react";
import { parsearCSV, type FilaParseada } from "@/lib/parsear-csv";
import { createClient } from "@/lib/supabase";
import VistaPrevia from "@/components/VistaPrevia";
import { useRouter } from "next/navigation";

type Estado = "inicio" | "leyendo-pdf" | "preview" | "exito" | "error";
interface MetadatosPDF { banco: string; periodo: string; }

export default function SubirArchivoPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("inicio");
  const [filasParseadas, setFilasParseadas] = useState<FilaParseada[]>([]);
  const [duplicados, setDuplicados] = useState<Set<number>>(new Set());
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [archivoOriginal, setArchivoOriginal] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [totalImportadas, setTotalImportadas] = useState(0);
  const [metadatosPDF, setMetadatosPDF] = useState<MetadatosPDF | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detecta cuáles filas ya existen en la BD (por fecha + monto + tipo)
  const detectarDuplicados = async (filas: FilaParseada[]): Promise<Set<number>> => {
    try {
      const supabase = createClient();
      // Rango de fechas del archivo
      const fechas = filas.map((f) => f.fecha).sort();
      const desde = fechas[0];
      const hasta = fechas[fechas.length - 1];

      const { data: existentes } = await supabase
        .from("transacciones")
        .select("fecha, monto, tipo")
        .gte("fecha", desde)
        .lte("fecha", hasta);

      if (!existentes || existentes.length === 0) return new Set();

      const clavesExistentes = new Set(
        existentes.map((t) => `${t.fecha}|${Number(t.monto).toFixed(2)}|${t.tipo}`)
      );

      const idxDuplicados = new Set<number>();
      filas.forEach((f, i) => {
        const clave = `${f.fecha}|${f.monto.toFixed(2)}|${f.tipo}`;
        if (clavesExistentes.has(clave)) idxDuplicados.add(i);
      });

      return idxDuplicados;
    } catch {
      return new Set();
    }
  };

  const handleSeleccion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setArchivoOriginal(archivo);
    setMensajeError("");
    e.target.value = "";
    const ext = archivo.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      const lector = new FileReader();
      lector.onload = async (ev) => {
        try {
          const filas = parsearCSV(ev.target?.result as string);
          if (filas.length === 0) { setMensajeError("No se encontraron transacciones en el CSV."); return; }
          const dups = await detectarDuplicados(filas);
          setDuplicados(dups);
          setFilasParseadas(filas);
          setEstado("preview");
        } catch { setMensajeError("Error al leer el CSV."); }
      };
      lector.readAsText(archivo, "utf-8");

    } else if (ext === "pdf") {
      setEstado("leyendo-pdf");
      const lector = new FileReader();
      lector.onload = async (ev) => {
        try {
          const base64 = (ev.target?.result as string).split(",")[1];
          const res = await fetch("/api/parsear-pdf", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfBase64: base64 }),
          });
          if (!res.ok) throw new Error(await res.text());
          const datos = await res.json();
          if (!datos.transacciones?.length) {
            setMensajeError("No se encontraron transacciones en el PDF.");
            setEstado("inicio");
            return;
          }
          const dups = await detectarDuplicados(datos.transacciones);
          setDuplicados(dups);
          setMetadatosPDF({ banco: datos.banco, periodo: datos.periodo });
          setFilasParseadas(datos.transacciones);
          setEstado("preview");
        } catch (err) {
          setMensajeError(err instanceof Error ? err.message : "Error al procesar el PDF");
          setEstado("error");
        }
      };
      lector.readAsDataURL(archivo);
    } else {
      setMensajeError("Solo se admiten archivos CSV o PDF.");
    }
  };

  const handleConfirmar = async (filasSeleccionadas: FilaParseada[]) => {
    if (!filasSeleccionadas.length) return;
    setGuardando(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");
      if (archivoOriginal) {
        await supabase.storage.from("archivos").upload(
          `${user.id}/${Date.now()}_${archivoOriginal.name}`, archivoOriginal
        );
      }
      for (let i = 0; i < filasSeleccionadas.length; i += 50) {
        const lote = filasSeleccionadas.slice(i, i + 50).map((f) => ({
          usuario_id: user.id, monto: f.monto, descripcion: f.descripcion,
          categoria: f.categoria, tipo: f.tipo, fecha: f.fecha,
        }));
        const { error } = await supabase.from("transacciones").insert(lote);
        if (error) throw error;
      }
      setTotalImportadas(filasSeleccionadas.length);
      setEstado("exito");
    } catch (e: unknown) {
      setMensajeError(e instanceof Error ? e.message : "Error al guardar");
      setEstado("error");
    } finally { setGuardando(false); }
  };

  const reiniciar = () => {
    setEstado("inicio"); setFilasParseadas([]); setNombreArchivo("");
    setArchivoOriginal(null); setMensajeError(""); setMetadatosPDF(null);
    setDuplicados(new Set());
  };

  // ── Estados especiales ─────────────────────────────────────────────

  if (estado === "leyendo-pdf") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 animate-pulse"
          style={{ backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)" }}>
          🐑
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-1)" }}>Lani está leyendo tu estado de cuenta</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>Extrayendo y categorizando transacciones…</p>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ backgroundColor: "var(--gold)", animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
        <p className="text-xs mt-6" style={{ color: "var(--text-3)" }}>{nombreArchivo}</p>
      </main>
    );
  }

  if (estado === "preview") {
    return (
      <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
        {metadatosPDF && (
          <div style={{ padding: "52px 20px 14px", borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 4 }}>
              Estado de cuenta detectado
            </p>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)" }}>{metadatosPDF.banco}</h2>
            <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{metadatosPDF.periodo}</p>
          </div>
        )}
        <VistaPrevia
          filas={filasParseadas}
          nombreArchivo={nombreArchivo}
          guardando={guardando}
          duplicados={duplicados}
          onConfirmar={handleConfirmar}
          onCancelar={reiniciar}
        />
      </div>
    );
  }

  if (estado === "exito") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
          style={{ backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)" }}>
          🐑
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-1)" }}>¡Listo!</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-3)" }}>
          Importé <strong style={{ color: "var(--gold)" }}>{totalImportadas}</strong> transacciones.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
          <button onClick={() => router.push("/dashboard")}
            style={{ padding: "14px 0", borderRadius: 14, fontSize: 14, fontWeight: 700, backgroundColor: "var(--gold)", color: "#0c0c0e", border: "none", cursor: "pointer" }}>
            Ver dashboard
          </button>
          <button onClick={reiniciar}
            style={{ padding: "13px 0", borderRadius: 14, fontSize: 13, fontWeight: 600, backgroundColor: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)", cursor: "pointer" }}>
            Subir otro archivo
          </button>
        </div>
      </main>
    );
  }

  if (estado === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
          style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>😕
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-1)" }}>Algo salió mal</h1>
        <p className="text-sm mb-8" style={{ color: "var(--danger)" }}>{mensajeError}</p>
        <button onClick={reiniciar}
          style={{ padding: "13px 28px", borderRadius: 14, fontSize: 13, fontWeight: 700, backgroundColor: "var(--surface-2)", color: "var(--text-1)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Intentar de nuevo
        </button>
      </main>
    );
  }

  // ── Estado inicial ─────────────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg)", padding: "56px 20px 120px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => router.back()}
          style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 16 }}>
          ← Volver
        </button>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 4 }}>
          Importar
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>
          Estado de cuenta
        </h1>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className="active:scale-[0.98] transition-transform"
        style={{
          borderRadius: 20, padding: "36px 20px",
          display: "flex", flexDirection: "column", alignItems: "center",
          cursor: "pointer", marginBottom: 12,
          backgroundColor: "var(--surface)",
          border: "1px dashed var(--gold-border)",
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 16, marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)",
        }}>
          📄
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>Toca para seleccionar</p>
        <p style={{ fontSize: 12, color: "var(--text-3)" }}>PDF · CSV</p>
        <input ref={inputRef} type="file" accept=".csv,.pdf" onChange={handleSeleccion} style={{ display: "none" }} />
      </div>

      {/* Lani badge */}
      <div style={{
        borderRadius: 16, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
        backgroundColor: "var(--surface)", border: "1px solid var(--border)",
      }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)" }}>
          🐑
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>Lani categoriza automáticamente</p>
          <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3, lineHeight: 1.4 }}>
            Sube tu edo. de cuenta y Lani extrae, categoriza y detecta duplicados
          </p>
        </div>
      </div>

      {mensajeError && (
        <div style={{ borderRadius: 12, padding: "10px 14px", marginBottom: 12, backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)" }}>{mensajeError}</p>
        </div>
      )}

      {/* Instrucciones por banco */}
      <div style={{ borderRadius: 20, padding: "18px 16px", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 14 }}>
          Cómo descargar tu estado de cuenta
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { banco: "BBVA", pasos: "App → Movimientos → Descargar → PDF" },
            { banco: "Santander", pasos: "App → Cuentas → Estado de cuenta → PDF" },
            { banco: "Banamex", pasos: "Banca en línea → Estado de cuenta → Descargar" },
            { banco: "Amex", pasos: "App → Cuenta → Estado de cuenta → PDF" },
            { banco: "Banorte", pasos: "App → Cuenta → Estado de cuenta → PDF" },
          ].map(({ banco, pasos }) => (
            <div key={banco} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                🏦
              </div>
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text-1)" }}>{banco}:</strong> {pasos}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
