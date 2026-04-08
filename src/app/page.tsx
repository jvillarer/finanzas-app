import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 p-6">
      <div className="text-center text-white mb-10">
        <h1 className="text-4xl font-bold mb-2">Finanzas App</h1>
        <p className="text-primary-100 text-lg">Tu gestor de finanzas personales</p>
      </div>

      <div className="grid gap-4 w-full max-w-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 bg-white text-primary-600 font-semibold px-6 py-4 rounded-2xl shadow-lg hover:bg-primary-50 transition-colors"
        >
          <span className="text-2xl">📊</span>
          <span>Dashboard</span>
        </Link>

        <Link
          href="/chat"
          className="flex items-center gap-3 bg-white text-primary-600 font-semibold px-6 py-4 rounded-2xl shadow-lg hover:bg-primary-50 transition-colors"
        >
          <span className="text-2xl">💬</span>
          <span>Chat con IA</span>
        </Link>

        <Link
          href="/subir-archivo"
          className="flex items-center gap-3 bg-white text-primary-600 font-semibold px-6 py-4 rounded-2xl shadow-lg hover:bg-primary-50 transition-colors"
        >
          <span className="text-2xl">📁</span>
          <span>Subir Archivo</span>
        </Link>
      </div>
    </main>
  );
}
