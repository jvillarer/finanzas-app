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
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#111" }}>
        <div className="text-6xl mb-6 animate-pulse">🐑</div>
        <h2 className="text-lg font-black text-white mb-2">Lani está leyendo tu estado de cuenta</h2>
        <p className="text-sm mb-6" style={{ color: "#6b7280" }}>Extrayendo y categorizando todas las transacciones...</p>
        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "#22c55e", animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
        <p className="text-xs mt-6" style={{ color: "#4b5563" }}>{nombreArchivo}</p>
      </main>
    );
  }

  // Vista previa
  if (estado === "preview") {
    return (
      <div style={{ backgroundColor: "#111", minHeight: "100vh" }}>
        {metadatosPDF && (
          <div className="px-5 pt-14 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: "#6b7280" }}>Estado de cuenta detectado</p>
            <h2 className="text-lg font-black text-white">{metadatosPDF.banco}</h2>
            <p className="text-sm" style={{ color: "#6b7280" }}>{metadatosPDF.periodo}</p>
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
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#111" }}>
        <div className="text-6xl mb-5">🐑</div>
        <h1 className="text-xl font-black text-white mb-2">¡Listo!</h1>
        <p className="text-sm mb-8" style={{ color: "#6b7280" }}>
          Importé <strong className="text-white">{totalImportadas}</strong> transacciones correctamente.
        </p>
        <button onClick={reiniciar} className="font-bold px-8 py-4 rounded-2xl text-sm" style={{ backgroundColor: "#22c55e", color: "#000" }}>
          Subir otro archivo
        </button>
      </main>
    );
  }

  // Error
  if (estado === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#111" }}>
        <div className="text-6xl mb-5">😕</div>
        <h1 className="text-xl font-black text-white mb-2">Algo salió mal</h1>
        <p className="text-sm mb-8" style={{ color: "#ef4444" }}>{mensajeError}</p>
        <button onClick={reiniciar} className="font-bold px-8 py-4 rounded-2xl text-sm" style={{ backgroundColor: "#22c55e", color: "#000" }}>
          Intentar de nuevo
        </button>
      </main>
    );
  }

  // Pantalla principal
  return (
    <main className="min-h-screen px-5 pt-14" style={{ backgroundColor: "#111" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight">Subir archivo</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Lani categoriza todo automáticamente</p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer mb-4 transition-all active:scale-[0.98]"
        style={{ backgroundColor: "#1c1c1c", border: "2px dashed rgba(255,255,255,0.1)" }}
      >
        <span className="text-4xl mb-4">📄</span>
        <p className="text-sm font-bold text-white mb-1">Toca para seleccionar</p>
        <p className="text-xs" style={{ color: "#6b7280" }}>PDF · CSV</p>
        <input ref={inputRef} type="file" accept=".csv,.pdf" onChange={handleSeleccion} className="hidden" />
      </div>

      {/* Lani badge */}
      <div
        className="rounded-2xl px-4 py-4 flex items-center gap-3 mb-4"
        style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)" }}
      >
        <span className="text-2xl">🐑</span>
        <div>
          <p className="text-sm font-bold text-white">Lani lo lee sola</p>
          <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Sube tu estado de cuenta en PDF y Lani extrae y categoriza todas las transacciones</p>
        </div>
      </div>

      {mensajeError && (
        <div className="rounded-2xl px-4 py-3 mb-4" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-sm font-semibold" style={{ color: "#ef4444" }}>{mensajeError}</p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="rounded-3xl p-5" style={{ backgroundColor: "#1c1c1c" }}>
        <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "#6b7280" }}>Cómo exportar tu edo. de cuenta</p>
        <ul className="space-y-3">
          {[
            { banco: "Santander", pasos: "App → Cuentas → Estado de cuenta → PDF" },
            { banco: "BBVA", pasos: "App → Movimientos → Descargar → PDF o CSV" },
            { banco: "Amex", pasos: "App → Cuenta → Estado de cuenta → PDF" },
            { banco: "Banamex", pasos: "Banca en línea → Estado de cuenta → Descargar" },
          ].map(({ banco, pasos }) => (
            <li key={banco} className="flex gap-3">
              <span className="text-sm">🏦</span>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                <strong className="text-white">{banco}:</strong> {pasos}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
