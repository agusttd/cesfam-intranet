// Forzar a Next.js a tratar esta página como dinámica
export const dynamic = 'force-dynamic'; // <--- AÑADE ESTA LÍNEA AL INICIO

import { PrismaClient, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import React from 'react';
import { headers } from 'next/headers'; // Importar headers de next/headers
import jwt from 'jsonwebtoken'; // Simplificar importación (opcional pero bueno)

// Importaciones de utilidades y componentes
import { Role } from "@/lib/constants";
import { SolicitudCard, ComunicadoCard, EventoCard } from "@/components/DashboardCards"; // Asegúrate que la ruta sea correcta

const prisma = new PrismaClient();

// --- Interfaces de Datos (Tipado para Server Component) ---
interface UsuarioDashboard {
    id: number;
    rol: string;
    nombre: string;
}
interface SolicitudData {
    id: number;
    tipo: string;
    fechaInicio: Date;
    fechaFin: Date;
    estado: string;
    solicitante: { nombre: string };
}
interface ComunicadoData {
    id: number;
    titulo: string;
    contenido: string;
    createdAt: Date;
    autor: { nombre: string };
}
interface EventoData {
    id: number;
    titulo: string;
    fechaInicio: Date;
    esFeriado: boolean;
}

// --- FUNCIONES DE CARGA DE DATOS ---
// (Estas funciones se mantienen igual)
async function getPendingSolicitudes(userId: number, rol: string): Promise<SolicitudData[]> {
    let where: Prisma.SolicitudWhereInput = { estado: "PENDIENTE" };

    switch (rol) {
        case "JEFE":
             where = {
                 estado: "PENDIENTE",
                 jefeAprobadorId: null,
                 solicitante: {
                     jefeId: userId
                 }
              };
            break;
        case "DIRECCION":
        case "SUBDIRECCION":
        case "ADMIN":
            where = {
                estado: "PENDIENTE",
                jefeAprobadorId: { not: null },
                direccionAprobadorId: null,
            };
            break;
        default: // Incluye FUNCIONARIO
             where = { estado: "PENDIENTE", solicitanteId: userId };
            break;
    }

    try {
        const solicitudes = await prisma.solicitud.findMany({
            where,
            orderBy: { creadoEn: 'asc' },
            take: 5,
            select: {
                id: true, tipo: true, fechaInicio: true, fechaFin: true, estado: true,
                solicitante: { select: { nombre: true } },
            },
        });
        return solicitudes;
    } catch (error) {
        console.error("Error fetching pending solicitudes:", error);
        return [];
    }
}


async function getLatestComunicados(): Promise<ComunicadoData[]> {
    try {
        const comunicados = await prisma.comunicado.findMany({
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
                id: true, titulo: true, contenido: true, createdAt: true,
                autor: { select: { nombre: true } },
            },
        });
        return comunicados;
    } catch (error) {
        console.error("Error fetching latest comunicados:", error);
        return [];
    }
}

async function getUpcomingEventos(): Promise<EventoData[]> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventos = await prisma.evento.findMany({
            where: { fechaInicio: { gte: today } },
            orderBy: { fechaInicio: 'asc' },
            take: 4,
            select: {
                id: true, titulo: true, fechaInicio: true, esFeriado: true,
            },
        });
        return eventos;
    } catch (error) {
        console.error("Error fetching upcoming eventos:", error);
        return [];
    }
}


// --- COMPONENTE SERVER PRINCIPAL ---
export default async function DashboardPage() {

    // 1. Leer headers y obtener token
    const headerList = headers();
    const authHeader = headerList.get("authorization"); // Intentar minúsculas primero
    let user: UsuarioDashboard | null = null;

    if (authHeader) {
        const token = authHeader.split(" ")[1];
        if (token) {
            try {
                // 2. Verificar token y obtener ID/Rol
                const decoded = jwt.verify(token, process.env.JWT_SECRET!);
                const userId = (decoded as { id: number }).id;

                // 3. Obtener detalles del usuario desde la BD
                const userDetails = await prisma.usuario.findUnique({
                    where: { id: userId, activo: true },
                    select: { id: true, rol: true, nombre: true }
                });
                user = userDetails;

            } catch (e) {
                console.error("Token inválido o expirado:", e);
            }
        } else {
             console.error("Authorization header presente pero sin token después de 'Bearer '");
        }
    } else {
        console.log("Authorization header no encontrado.");
    }

    // 4. Redirigir si no hay usuario válido
    if (!user) {
        console.log("Usuario no válido o no encontrado, redirigiendo a /");
        redirect('/');
    }

    // 5. Cargar datos
    console.log(`Cargando datos del dashboard para ${user.nombre} (${user.rol})...`);
    const [pendingSolicitudes, latestComunicados, upcomingEventos] = await Promise.all([
        getPendingSolicitudes(user.id, user.rol),
        getLatestComunicados(),
        getUpcomingEventos(),
    ]);
    console.log(`Datos cargados: ${pendingSolicitudes.length} solicitudes, ${latestComunicados.length} comunicados, ${upcomingEventos.length} eventos.`);

    // 6. Pasar datos al Componente Cliente
    return (
        <DashboardClient
            user={user}
            pendingSolicitudes={pendingSolicitudes}
            latestComunicados={latestComunicados}
            upcomingEventos={upcomingEventos}
        />
    );
}

// --- COMPONENTE CLIENTE (Renderiza la interfaz) ---
// (Este componente se mantiene exactamente igual que antes)
function DashboardClient({
    user,
    pendingSolicitudes,
    latestComunicados,
    upcomingEventos,
}: {
    user: UsuarioDashboard;
    pendingSolicitudes: SolicitudData[];
    latestComunicados: ComunicadoData[];
    upcomingEventos: EventoData[];
}) {
    // Componentes utilitarios (Card)
    interface CardProps { children: React.ReactNode; className?: string; style?: React.CSSProperties }
    const Card = ({ children, className = '', style }: Readonly<CardProps>) => (
        <div className={`bg-white p-5 rounded-lg shadow-md ${className}`} style={style}>
            {children}
        </div>
    );

    const userRol = user.rol as Role;

    // Función para determinar el texto y enlace del panel de rol
    const getPendingTasks = () => {
        const isApprover = [Role.JEFE, Role.DIRECCION, Role.SUBDIRECCION, Role.ADMIN].includes(userRol);
        const count = pendingSolicitudes.length;

        if (isApprover) {
             const baseHref = '/dashboard/solicitudes';
             let label = count > 0 ? `Revisar ${count} Solicitud(es) Pendiente(s)` : 'Revisar Solicitudes';
             let color = count > 0 ? 'red' : 'green'; // Color borde

             if (userRol === Role.SUBDIRECCION) {
                 label = count > 0 ? `Revisar Solicitudes (${count}) y Licencias` : 'Gestionar Licencias';
                 color = 'purple';
             } else if (userRol === Role.ADMIN || userRol === Role.DIRECCION) {
                 label = count > 0 ? `Revisar ${count} Solicitud(es)` : 'Gestionar Solicitudes/Usuarios';
                 color = count > 0 ? 'orange' : 'blue';
             } else if (userRol === Role.JEFE) {
                 label = count > 0 ? `Revisar ${count} Solicitud(es) (Equipo)` : 'Revisar Solicitudes Equipo';
                 color = count > 0 ? 'yellow' : 'gray';
             }

             // Asegúrate que los colores existan en Tailwind (ej. border-red-500)
             return { label, href: baseHref, color: `border-${color}-500` };
        } else {
             // Funcionario normal
              const funcionarioLabel = count > 0 ? `Ver mis ${count} Solicitud(es) Pendiente(s)` : 'Ver mis Solicitudes';
             return { label: funcionarioLabel, href: '/dashboard/solicitudes', color: 'border-blue-500' };
        }
    };

    const pendingTasks = getPendingTasks();

    return (
        <div className="p-6 md:p-8 space-y-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Panel General 🏠</h1>
            <p className="text-gray-600">
                ¡Bienvenido, {user.nombre}! ({user.rol})
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

                {/* 1. WIDGET DE TAREAS POR ROL */}
                <Card className={`lg:col-span-1 border-l-4 ${pendingTasks.color}`}>
                    <h2 className="text-lg md:text-xl font-semibold mb-3 text-gray-700">Panel de Rol</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Acciones principales para tu rol:
                    </p>
                    <Link href={pendingTasks.href} className={`block p-3 rounded-md text-center font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow`}>
                        {pendingTasks.label} →
                    </Link>
                </Card>

                {/* 2. WIDGET DE COMUNICADOS */}
                <Card className="lg:col-span-2">
                    <h2 className="text-lg md:text-xl font-semibold mb-3 text-gray-700">📣 Comunicados Recientes</h2>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {latestComunicados.length === 0 ? (
                            <p className="text-gray-500 italic text-sm">No hay comunicados recientes.</p>
                        ) : (
                            latestComunicados.map((c) => (
                                <ComunicadoCard key={c.id} comunicado={{...c, fechaPublicacion: c.createdAt.toISOString()}} />
                            ))
                        )}
                    </div>
                    <Link href="/dashboard/comunicados" className="mt-4 block text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Ver todos los comunicados →
                    </Link>
                </Card>

                {/* 3. WIDGET DE CALENDARIO */}
                <Card className="lg:col-span-3">
                    <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-700">📅 Próximos Eventos y Feriados</h2>
                    {upcomingEventos.length === 0 ? (
                       <p className="text-gray-500 italic text-sm">No hay eventos próximos registrados.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {upcomingEventos.map((e) => (
                           <EventoCard key={e.id} evento={{...e, fecha: e.fechaInicio.toISOString()}} />
                        ))}
                      </div>
                    )}
                    <Link href="/dashboard/calendario" className="mt-4 block text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Ver Calendario Completo →
                    </Link>
                </Card>
            </div>

            {/* ENLACES RÁPIDOS PARA ADMIN/DIRECCIÓN */}
            {(userRol === Role.ADMIN || userRol === Role.DIRECCION) && (
                <Card className="mt-8 bg-indigo-50 border border-indigo-200">
                    <h2 className="text-lg md:text-xl font-semibold text-indigo-800 mb-4">Panel de Administración</h2>
                    <div className="flex flex-wrap gap-4">
                        <Link href="/dashboard/admin" className="text-indigo-600 hover:text-indigo-800 font-medium underline">
                            Gestionar Usuarios
                        </Link>
                        <Link href="/dashboard/licencias" className="text-indigo-600 hover:text-indigo-800 font-medium underline">
                             Ver Reporte Licencias
                        </Link>
                         <Link href="/dashboard/calendario" className="text-indigo-600 hover:text-indigo-800 font-medium underline">
                             Administrar Calendario
                        </Link>
                         <Link href="/dashboard/documentos" className="text-indigo-600 hover:text-indigo-800 font-medium underline">
                             Administrar Documentos
                        </Link>
                        <Link href="/dashboard/comunicados" className="text-indigo-600 hover:text-indigo-800 font-medium underline">
                             Administrar Comunicados
                        </Link>
                    </div>
                </Card>
            )}
        </div>
    );
}