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
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfBase64: base64 }),
          });
          if (!res.ok) throw new Error(await res.text());
          const datos = await res.json();
          if (!datos.transacciones?.length) {
            setMensajeError("No se encontraron transacciones en el PDF.");
            setEstado("inicio"); return;
          }
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
  };

  // Leyendo PDF
  if (estado === "leyendo-pdf") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--bg)" }}>
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6 animate-pulse"
          style={{
            background: "linear-gradient(135deg, #1a5e44, #2a8a64)",
            boxShadow: "0 12px 32px rgba(31,107,78,0.3)",
          }}
        >
          🐑
        </div>
        <h2 className="text-lg font-black mb-2" style={{ color: "var(--text-1)" }}>Lani está leyendo tu estado de cuenta</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>Extrayendo y categorizando todas las transacciones...</p>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ backgroundColor: "var(--accent)", animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="text-xs mt-6" style={{ color: "var(--text-3)" }}>{nombreArchivo}</p>
      </main>
    );
  }

  // Vista previa
  if (estado === "preview") {
    return (
      <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
        {metadatosPDF && (
          <div className="px-5 pt-14 pb-4 bg-white" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "var(--text-3)" }}>Estado de cuenta detectado</p>
            <h2 className="text-lg font-black" style={{ color: "var(--text-1)" }}>{metadatosPDF.banco}</h2>
            <p className="text-sm" style={{ color: "var(--text-2)" }}>{metadatosPDF.periodo}</p>
          </div>
        )}
        <VistaPrevia
          filas={filasParseadas}
          nombreArchivo={nombreArchivo}
          guardando={guardando}
          onConfirmar={handleConfirmar}
          onCancelar={reiniciar}
        />
      </div>
    );
  }

  // Éxito
  if (estado === "exito") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--bg)" }}>
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6"
          style={{
            background: "linear-gradient(135deg, #1a5e44, #2a8a64)",
            boxShadow: "0 12px 32px rgba(31,107,78,0.3)",
          }}
        >
          🐑
        </div>
        <h1 className="text-xl font-black mb-2" style={{ color: "var(--text-1)" }}>¡Listo!</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-3)" }}>
          Importé <strong style={{ color: "var(--text-1)" }}>{totalImportadas}</strong> transacciones correctamente.
        </p>
        <button
          onClick={reiniciar}
          className="font-bold px-8 py-4 rounded-full text-sm text-white"
          style={{ backgroundColor: "var(--text-1)" }}
        >
          Subir otro archivo
        </button>
      </main>
    );
  }

  // Error
  if (estado === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--bg)" }}>
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          😕
        </div>
        <h1 className="text-xl font-black mb-2" style={{ color: "var(--text-1)" }}>Algo salió mal</h1>
        <p className="text-sm mb-8 text-red-500">{mensajeError}</p>
        <button
          onClick={reiniciar}
          className="font-bold px-8 py-4 rounded-full text-sm text-white"
          style={{ backgroundColor: "var(--text-1)" }}
        >
          Intentar de nuevo
        </button>
      </main>
    );
  }

  // Pantalla principal
  return (
    <main className="min-h-screen px-5 pt-14" style={{ backgroundColor: "var(--bg)" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-1)" }}>Subir archivo</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Lani categoriza todo automáticamente</p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer mb-4 transition-all active:scale-[0.98] bg-white"
        style={{ border: "2px dashed rgba(0,0,0,0.10)", boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
          style={{ backgroundColor: "var(--accent-light)" }}
        >
          📄
        </div>
        <p className="text-sm font-bold mb-1" style={{ color: "var(--text-1)" }}>Toca para seleccionar</p>
        <p className="text-xs" style={{ color: "var(--text-3)" }}>PDF · CSV</p>
        <input ref={inputRef} type="file" accept=".csv,.pdf" onChange={handleSeleccion} className="hidden" />
      </div>

      {/* Lani badge */}
      <div
        className="rounded-2xl px-4 py-4 flex items-center gap-3 mb-4 bg-white"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: "linear-gradient(135deg, #1a5e44, #2a8a64)" }}
        >
          🐑
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>Lani lo lee sola</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-3)" }}>Sube tu estado de cuenta en PDF y Lani extrae y categoriza todas las transacciones</p>
        </div>
      </div>

      {mensajeError && (
        <div className="rounded-2xl px-4 py-3 mb-4 bg-red-50 border border-red-100">
          <p className="text-sm font-semibold text-red-600">{mensajeError}</p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="rounded-3xl p-5 bg-white" style={{ boxShadow: "var(--shadow-sm)" }}>
        <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--text-3)" }}>Cómo exportar tu edo. de cuenta</p>
        <ul className="space-y-3">
          {[
            { banco: "Santander", pasos: "App → Cuentas → Estado de cuenta → PDF" },
            { banco: "BBVA", pasos: "App → Movimientos → Descargar → PDF o CSV" },
            { banco: "Amex", pasos: "App → Cuenta → Estado de cuenta → PDF" },
            { banco: "Banamex", pasos: "Banca en línea → Estado de cuenta → Descargar" },
          ].map(({ banco, pasos }) => (
            <li key={banco} className="flex gap-3 items-start">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: "var(--surface-2)" }}
              >
                🏦
              </div>
              <p className="text-xs pt-1" style={{ color: "var(--text-2)" }}>
                <strong style={{ color: "var(--text-1)" }}>{banco}:</strong> {pasos}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
