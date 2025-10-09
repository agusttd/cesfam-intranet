'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getRol, clearAuthData } from '@/lib/auth'; // Necesitas la función clearAuthData
import { Role } from '@/lib/constants'; 
import Sidebar from '@/components/Sidebar'; // Importamos el Sidebar que acabamos de crear

/*
 * NOTA IMPORTANTE: 
 * Este layout protegerá todas las rutas que estén DENTRO de la carpeta 'src/app/dashboard'.
 * Las rutas como /documentos, /solicitudes, etc., deben estar anidadas BAJO /dashboard
 * para que este layout funcione como protección centralizada.
 * * ESTRUCTURA RECOMENDADA:
 * - src/app/page.tsx (Login)
 * - src/app/dashboard/layout.tsx (Este archivo, la protección)
 * - src/app/dashboard/page.tsx (Dashboard principal)
 * - src/app/dashboard/documentos/page.tsx
 * - src/app/dashboard/solicitudes/page.tsx
 * - src/app/dashboard/admin/page.tsx
 */

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userRole, setUserRole] = useState<Role | null>(null);

    // 1. Lógica de Autenticación y Redirección
    useEffect(() => {
        const token = getToken();
        const rol = getRol();

        if (!token || !rol) {
            // No hay sesión, redirigir a la ruta de Login
            router.replace('/'); 
        } else {
            // Sesión válida
            setUserRole(rol);
            setIsAuthenticated(true);
        }
    }, [router]);

    const handleLogout = () => {
        clearAuthData(); // Eliminar token y rol del almacenamiento local
        router.replace('/');
    };

    if (!isAuthenticated || !userRole) {
        // Mostrar un spinner o mensaje de carga mientras se verifica la sesión
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-gray-600 text-lg font-semibold">Cargando sesión...</div>
            </div>
        );
    }

    // 2. Renderizado de la estructura protegida
    return (
        <div className="flex min-h-screen">
            <Sidebar userRole={userRole} onLogout={handleLogout} />
            
            {/* El margin-left debe ser igual al ancho del sidebar (w-64) */}
            <main className="flex-grow ml-64 p-8 bg-gray-50">
                {children}
            </main>
        </div>
    );
}