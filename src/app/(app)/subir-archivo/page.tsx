"use client";

import { useState, useRef } from "react";
import { parsearCSV, type FilaParseada } from "@/lib/parsear-csv";
import { createClient } from "@/lib/supabase";
import VistaPrevia from "@/components/VistaPrevia";

type Estado = "inicio" | "preview" | "exito" | "error";

export default function SubirArchivoPage() {
  const [estado, setEstado] = useState<Estado>("inicio");
  const [filasParseadas, setFilasParseadas] = useState<FilaParseada[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [archivoOriginal, setArchivoOriginal] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [totalImportadas, setTotalImportadas] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSeleccion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setNombreArchivo(archivo.name);
    setArchivoOriginal(archivo);
    setMensajeError("");

    const extension = archivo.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
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
    } else {
      setMensajeError("Por ahora solo se admiten archivos CSV. Exporta tu estado de cuenta en formato CSV desde tu banco.");
    }

    // Limpiar input para permitir seleccionar el mismo archivo
    e.target.value = "";
  };

  const handleConfirmar = async (filasSeleccionadas: FilaParseada[]) => {
    if (filasSeleccionadas.length === 0) return;
    setGuardando(true);

    const supabase = createClient();

    try {
      // 1. Obtener usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa");

      // 2. Subir archivo original a Storage
      if (archivoOriginal) {
        const rutaArchivo = `${user.id}/${Date.now()}_${archivoOriginal.name}`;
        await supabase.storage.from("archivos").upload(rutaArchivo, archivoOriginal);
        // No interrumpir el flujo si falla el storage
      }

      // 3. Insertar transacciones en lotes de 50
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
  };

  // Vista previa
  if (estado === "preview") {
    return (
      <VistaPrevia
        filas={filasParseadas}
        nombreArchivo={nombreArchivo}
        guardando={guardando}
        onConfirmar={handleConfirmar}
        onCancelar={reiniciar}
      />
    );
  }

  // Éxito
  if (estado === "exito") {
    return (
      <main className="bg-gray-50 p-6 flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          ¡Importación exitosa!
        </h1>
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

  // Pantalla principal
  return (
    <main className="bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-primary-600">Subir Archivo</h1>
        <p className="text-gray-500 text-sm">
          Importa tu estado de cuenta en CSV
        </p>
      </header>

      {/* Zona de carga */}
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-primary-300 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors mb-4"
      >
        <span className="text-5xl mb-3">📄</span>
        <p className="text-gray-600 text-sm font-medium">Toca para seleccionar</p>
        <p className="text-gray-400 text-xs mt-1">Archivos CSV</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleSeleccion}
          className="hidden"
        />
      </div>

      {mensajeError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-500 text-sm">{mensajeError}</p>
        </div>
      )}

      {/* Instrucciones */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-600 mb-3">
          ¿Cómo exportar mi estado de cuenta?
        </p>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex gap-2">
            <span className="shrink-0">🏦</span>
            <span><strong>BBVA:</strong> App o web → Movimientos → Descargar → CSV</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">🏦</span>
            <span><strong>Santander:</strong> App → Cuentas → Movimientos → Exportar</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">🏦</span>
            <span><strong>Banamex:</strong> Banca en línea → Estado de cuenta → CSV</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0">🏦</span>
            <span><strong>Otros:</strong> Busca la opción "Exportar movimientos" o "Descargar CSV"</span>
          </li>
        </ul>
      </div>
    </main>
  );
}
