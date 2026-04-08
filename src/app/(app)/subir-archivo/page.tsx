"use client";

import { useState, useRef } from "react";
import { parsearCSV, type FilaParseada } from "@/lib/parsear-csv";
import { createClient } from "@/lib/supabase";
import VistaPrevia from "@/components/VistaPrevia";

type Estado = "inicio" | "leyendo-pdf" | "preview" | "exito" | "error";

interface MetadatosPDF {
  banco: string;
  periodo: string;
}

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

    const extension = archivo.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      // --- Parseo CSV existente ---
      const lector = new FileReader();
      lector.onload = (ev) => {
        const contenido = ev.target?.result as string;
        try {
          const filas = parsearCSV(contenido);
          if (filas.length === 0) {
            setMensajeError("No se encontraron transacciones. Verifica que el archivo tenga el formato correcto.");
            return;
          }
          setFilasParseadas(filas);
          setEstado("preview");
        } catch {
          setMensajeError("Error al leer el archivo. Asegúrate de que sea un CSV válido.");
        }
      };
      lector.readAsText(archivo, "utf-8");

    } else if (extension === "pdf") {
      // --- Parseo PDF con Claude ---
      setEstado("leyendo-pdf");

      const lector = new FileReader();
      lector.onload = async (ev) => {
        try {
          const resultado = ev.target?.result as string;
          // Extraer solo el base64 (quitar "data:application/pdf;base64,")
          const base64 = resultado.split(",")[1];

          const res = await fetch("/api/parsear-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfBase64: base64 }),
          });

          if (!res.ok) {
            const texto = await res.text();
            throw new Error(texto || "Error al procesar el PDF");
          }

          const datos = await res.json();

          if (!datos.transacciones || datos.transacciones.length === 0) {
            setMensajeError("Claude no encontró transacciones en el PDF. ¿Es un estado de cuenta bancario?");
            setEstado("inicio");
            return;
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
    if (filasSeleccionadas.length === 0) return;
    setGuardando(true);

    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      // Subir archivo original a Storage
      if (archivoOriginal) {
        const rutaArchivo = `${user.id}/${Date.now()}_${archivoOriginal.name}`;
        await supabase.storage.from("archivos").upload(rutaArchivo, archivoOriginal);
      }

      // Insertar transacciones en lotes de 50
      const TAMANO_LOTE = 50;
      for (let i = 0; i < filasSeleccionadas.length; i += TAMANO_LOTE) {
        const lote = filasSeleccionadas.slice(i, i + TAMANO_LOTE).map((f) => ({
          usuario_id: user.id,
          monto: f.monto,
          descripcion: f.descripcion,
          categoria: f.categoria,
          tipo: f.tipo,
          fecha: f.fecha,
        }));

        const { error } = await supabase.from("transacciones").insert(lote);
        if (error) throw error;
      }

      setTotalImportadas(filasSeleccionadas.length);
      setEstado("exito");
    } catch (e: unknown) {
      setMensajeError(e instanceof Error ? e.message : "Error al guardar las transacciones");
      setEstado("error");
    } finally {
      setGuardando(false);
    }
  };

  const reiniciar = () => {
    setEstado("inicio");
    setFilasParseadas([]);
    setNombreArchivo("");
    setArchivoOriginal(null);
    setMensajeError("");
    setMetadatosPDF(null);
  };

  // Estado: Claude leyendo el PDF
  if (estado === "leyendo-pdf") {
    return (
      <main className="bg-gray-50 flex flex-col items-center justify-center min-h-[80vh] p-6 text-center">
        <div className="text-6xl mb-6 animate-pulse">🤖</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Claude está leyendo tu estado de cuenta</h2>
        <p className="text-gray-500 text-sm mb-6">Extrayendo y categorizando todas las transacciones...</p>
        <div className="flex gap-2 justify-center">
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-xs text-gray-400 mt-6">{nombreArchivo}</p>
      </main>
    );
  }

  // Vista previa
  if (estado === "preview") {
    return (
      <div>
        {metadatosPDF && (
          <div className="bg-primary-500 text-white px-6 pt-8 pb-4">
            <p className="text-xs text-primary-200 mb-1">Estado de cuenta detectado</p>
            <h2 className="text-lg font-bold">{metadatosPDF.banco}</h2>
            <p className="text-primary-200 text-sm">{metadatosPDF.periodo}</p>
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
      <main className="bg-gray-50 p-6 flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">¡Importación exitosa!</h1>
        <p className="text-gray-500 text-sm mb-8">
          Se importaron <strong>{totalImportadas}</strong> transacciones correctamente.
        </p>
        <button
          onClick={reiniciar}
          className="bg-primary-500 text-white font-semibold px-8 py-3 rounded-2xl hover:bg-primary-600 transition-colors"
        >
          Subir otro archivo
        </button>
      </main>
    );
  }

  // Error
  if (estado === "error") {
    return (
      <main className="bg-gray-50 p-6 flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Algo salió mal</h1>
        <p className="text-red-500 text-sm mb-8">{mensajeError}</p>
        <button
          onClick={reiniciar}
          className="bg-primary-500 text-white font-semibold px-8 py-3 rounded-2xl hover:bg-primary-600 transition-colors"
        >
          Intentar de nuevo
        </button>
      </main>
    );
  }

  // Pantalla principal
  return (
    <main className="bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-primary-600">Subir Archivo</h1>
        <p className="text-gray-500 text-sm">
          Importa tu estado de cuenta en PDF o CSV
        </p>
      </header>

      {/* Zona de carga */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-primary-300 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors mb-4"
      >
        <span className="text-5xl mb-3">📄</span>
        <p className="text-gray-600 text-sm font-medium">Toca para seleccionar</p>
        <p className="text-gray-400 text-xs mt-1">PDF · CSV</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.pdf"
          onChange={handleSeleccion}
          className="hidden"
        />
      </div>

      {/* Badge PDF con IA */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
        <span className="text-2xl">🤖</span>
        <div>
          <p className="text-primary-700 text-sm font-semibold">PDF con IA</p>
          <p className="text-primary-500 text-xs">Sube tu estado de cuenta en PDF y Claude extrae y categoriza todas las transacciones automáticamente</p>
        </div>
      </div>

      {mensajeError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-500 text-sm">{mensajeError}</p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-600 mb-3">¿Cómo exportar mi estado de cuenta?</p>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex gap-2">
            <span className="shrink-0">🏦</span>
            <span><strong>Santander:</strong> App → Cuentas → Estado de cuenta → Descargar PDF</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">🏦</span>
            <span><strong>BBVA:</strong> App o web → Movimientos → Descargar → PDF o CSV</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">🏦</span>
            <span><strong>Amex:</strong> App → Cuenta → Estado de cuenta → PDF</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">🏦</span>
            <span><strong>Banamex:</strong> Banca en línea → Estado de cuenta → Descargar</span>
          </li>
        </ul>
      </div>
    </main>
  );
}
