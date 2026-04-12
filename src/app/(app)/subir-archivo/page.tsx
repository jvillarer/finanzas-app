"use client";

import { useState, useRef } from "react";
import { parsearCSV, type FilaParseada } from "@/lib/parsear-csv";
import { createClient } from "@/lib/supabase";
import VistaPrevia from "@/components/VistaPrevia";

type Estado = "inicio" | "leyendo-pdf" | "preview" | "exito" | "error";
interface MetadatosPDF { banco: string; periodo: string; }

export default function SubirArchivoPage() {
  const [estado, setEstado] = useState<Estado>("inicio");
  const [filasParseadas, setFilasParseadas] = useState<FilaParseada[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [archivoOriginal, setArchivoOriginal] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [totalImportadas, setTotalImportadas] = useState(0);
  const [metadatosPDF, setMetadatosPDF] = useState<MetadatosPDF | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      lector.onload = (ev) => {
        try {
          const filas = parsearCSV(ev.target?.result as string);
          if (filas.length === 0) { setMensajeError("No se encontraron transacciones en el CSV."); return; }
          setFilasParseadas(filas); setEstado("preview");
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
          if (!datos.transacciones?.length) { setMensajeError("No se encontraron transacciones en el PDF."); setEstado("inicio"); return; }
          setMetadatosPDF({ banco: datos.banco, periodo: datos.periodo });
          setFilasParseadas(datos.transacciones); setEstado("preview");
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
        await supabase.storage.from("archivos").upload(`${user.id}/${Date.now()}_${archivoOriginal.name}`, archivoOriginal);
      }
      for (let i = 0; i < filasSeleccionadas.length; i += 50) {
        const lote = filasSeleccionadas.slice(i, i + 50).map((f) => ({
          usuario_id: user.id, monto: f.monto, descripcion: f.descripcion,
          categoria: f.categoria, tipo: f.tipo, fecha: f.fecha,
        }));
        const { error } = await supabase.from("transacciones").insert(lote);
        if (error) throw error;
      }
      setTotalImportadas(filasSeleccionadas.length); setEstado("exito");
    } catch (e: unknown) {
      setMensajeError(e instanceof Error ? e.message : "Error al guardar"); setEstado("error");
    } finally { setGuardando(false); }
  };

  const reiniciar = () => {
    setEstado("inicio"); setFilasParseadas([]); setNombreArchivo("");
    setArchivoOriginal(null); setMensajeError(""); setMetadatosPDF(null);
  };

  if (estado === "leyendo-pdf") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6 animate-pulse"
          style={{ backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)" }}>
          🐑
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-1)" }}>Lani está analizando tu estado de cuenta</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>Extrayendo y categorizando transacciones...</p>
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
          <div className="px-5 pt-14 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Estado de cuenta detectado</p>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-1)" }}>{metadatosPDF.banco}</h2>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>{metadatosPDF.periodo}</p>
          </div>
        )}
        <VistaPrevia filas={filasParseadas} nombreArchivo={nombreArchivo} guardando={guardando} onConfirmar={handleConfirmar} onCancelar={reiniciar} />
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
        <button onClick={reiniciar} className="font-bold px-8 py-3.5 rounded-xl text-sm"
          style={{ backgroundColor: "var(--gold)", color: "#0c0c0e" }}>
          Subir otro archivo
        </button>
      </main>
    );
  }

  if (estado === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-6"
          style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border)" }}>😕</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-1)" }}>Algo salió mal</h1>
        <p className="text-sm mb-8" style={{ color: "var(--danger)" }}>{mensajeError}</p>
        <button onClick={reiniciar} className="font-bold px-8 py-3.5 rounded-xl text-sm"
          style={{ backgroundColor: "var(--surface-2)", color: "var(--text-1)", border: "1px solid var(--border)" }}>
          Intentar de nuevo
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 pt-14 pb-28" style={{ backgroundColor: "var(--bg)" }}>
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Importar</p>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>Subir archivo</h1>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer mb-4 transition-all active:scale-[0.98]"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px dashed var(--border)",
        }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
          style={{ backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)" }}>
          📄
        </div>
        <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Toca para seleccionar</p>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>PDF · CSV</p>
        <input ref={inputRef} type="file" accept=".csv,.pdf" onChange={handleSeleccion} className="hidden" />
      </div>

      {/* Lani badge */}
      <div className="rounded-2xl px-4 py-4 flex items-center gap-3 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: "var(--gold-dim)", border: "1px solid var(--gold-border)" }}>
          🐑
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Lani categoriza automáticamente</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-3)" }}>Sube tu estado de cuenta y Lani extrae todas las transacciones</p>
        </div>
      </div>

      {mensajeError && (
        <div className="rounded-xl px-4 py-3 mb-4" style={{ backgroundColor: "var(--danger-dim)", border: "1px solid rgba(240,110,110,0.2)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>{mensajeError}</p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-3)" }}>Cómo exportar tu edo. de cuenta</p>
        <ul className="space-y-3">
          {[
            { banco: "Santander", pasos: "App → Cuentas → Estado de cuenta → PDF" },
            { banco: "BBVA", pasos: "App → Movimientos → Descargar → PDF o CSV" },
            { banco: "Amex", pasos: "App → Cuenta → Estado de cuenta → PDF" },
            { banco: "Banamex", pasos: "Banca en línea → Estado de cuenta → Descargar" },
          ].map(({ banco, pasos }) => (
            <li key={banco} className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 mt-0.5"
                style={{ backgroundColor: "var(--surface-2)" }}>🏦</div>
              <p className="text-xs" style={{ color: "var(--text-2)" }}>
                <strong style={{ color: "var(--text-1)" }}>{banco}:</strong> {pasos}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
