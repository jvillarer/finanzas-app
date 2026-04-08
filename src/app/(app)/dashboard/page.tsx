"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  obtenerTransacciones,
  calcularResumen,
  formatearMonto,
} from "@/lib/transacciones";
import type { Transaccion } from "@/lib/supabase";
import NuevaTransaccion from "@/components/NuevaTransaccion";
import { createClient } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cerrarSesion = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const cargar = async () => {
    try {
      const datos = await obtenerTransacciones();
      setTransacciones(datos);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const { ingresos, gastos, balance } = calcularResumen(transacciones);

  const mesActual = new Date().toLocaleString("es-MX", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Encabezado */}
      <header className="bg-primary-500 text-white px-6 pt-8 pb-16">
        <p className="text-primary-200 text-xs capitalize">{mesActual}</p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold">Mis Finanzas</h1>
          <button
            onClick={cerrarSesion}
            className="text-primary-200 text-xs underline"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Tarjeta de balance flotante */}
      <div className="px-4 -mt-10">
        <div className="bg-white rounded-2xl shadow-md p-5 mb-4">
          <p className="text-xs text-gray-400 mb-1">Balance total</p>
          <p
            className={`text-3xl font-bold mb-4 ${
              balance >= 0 ? "text-primary-600" : "text-red-500"
            }`}
          >
            {formatearMonto(balance)}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Ingresos</p>
              <p className="text-base font-semibold text-green-600">
                {formatearMonto(ingresos)}
              </p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">Gastos</p>
              <p className="text-base font-semibold text-red-500">
                {formatearMonto(gastos)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transacciones recientes */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-600">
            Transacciones recientes
          </h2>
          <Link
            href="/subir-archivo"
            className="text-xs text-primary-500 font-medium"
          >
            Subir archivo
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {cargando ? (
            <p className="text-center text-gray-400 text-sm py-10">
              Cargando...
            </p>
          ) : transacciones.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">
              No hay transacciones aún
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {transacciones.slice(0, 20).map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">
                    {t.tipo === "ingreso" ? "💰" : "💸"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {t.descripcion || t.categoria || "Sin descripción"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.fecha).toLocaleDateString("es-MX")}
                      {t.categoria ? ` · ${t.categoria}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      t.tipo === "ingreso" ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {t.tipo === "ingreso" ? "+" : "-"}
                    {formatearMonto(t.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Botón flotante */}
      <button
        onClick={() => setMostrarFormulario(true)}
        className="fixed bottom-6 right-6 bg-primary-500 text-white w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-primary-600 transition-colors"
        aria-label="Nueva transacción"
      >
        +
      </button>

      {/* Modal nueva transacción */}
      {mostrarFormulario && (
        <NuevaTransaccion
          onCerrar={() => setMostrarFormulario(false)}
          onGuardado={() => {
            setMostrarFormulario(false);
            cargar();
          }}
        />
      )}
    </main>
  );
}
