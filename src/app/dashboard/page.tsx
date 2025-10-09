// src/app/dashboard/page.tsx
'use client'

// Contenido simple para el dashboard general del funcionario
export default function FuncionarioDashboard() {
  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Panel General de la Intranet</h1>
        <p className="text-gray-600">
            Bienvenido al CESFAM Santa Rosa. Utiliza el menú lateral para acceder a documentos, solicitudes y comunicados.
        </p>
        
        {/* Aquí puedes integrar la visualización de comunicados o enlaces rápidos */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h2 className="text-xl font-semibold mb-3">Accesos Rápidos</h2>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li><a href="/dashboard/documentos" className="hover:underline">Ver Documentos y Protocolos</a></li>
                <li><a href="/dashboard/solicitudes" className="hover:underline">Mis Solicitudes y Vacaciones</a></li>
            </ul>
        </div>
    </div>
  )
}