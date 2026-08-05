export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-gray-900">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-sans text-sm flex flex-col gap-6">
        <h1 className="text-4xl font-bold text-blue-600">FEMAR Workforce AI</h1>
        <p className="text-xl">Plataforma de Asistencia y Prenómina (MVP Core)</p>
        <div className="flex gap-4 mt-8">
          <a
            href="/api/health"
            className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            Check Health Status
          </a>
          <a
            href="/prepayroll"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Prenómina Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
