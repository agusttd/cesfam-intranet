import { PrismaClient, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link"; 
import React from 'react';
import { headers } from 'next/headers'; // NECESARIO para Server Component

// FIX 1: Usar import tradicional en lugar de require()
import * as jwt from 'jsonwebtoken'; 

// Importaciones de utilidades.
import { Role } from "@/lib/constants"; 
import { SolicitudCard, ComunicadoCard, EventoCard } from "@/components/DashboardCards"; 

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


// --- 1. FUNCIÓN AUXILIAR DE AUTENTICACIÓN (Server Component FIX) ---
async function getUserFromTokenSC(): Promise<UsuarioDashboard | null> { 
    // FIX 2: Usamos next/headers y llamamos a .get() directamente (no es una promesa)
    const auth = headers().get("authorization"); 
    if (!auth) return null;
    const token = auth.split(" ")[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        // Consultar el usuario completo para el nombre y rol (FIX 4)
        const userDetails = await prisma.usuario.findUnique({
            where: { id: (decoded as { id: number }).id },
            select: { id: true, rol: true, nombre: true } 
        });
        return userDetails; 
    } catch {
        return null;
    }
}


// --- 2. FUNCIONES DE CARGA DE DATOS ---

async function getPendingSolicitudes(userId: number, rol: string): Promise<SolicitudData[]> {
    let where: Prisma.SolicitudWhereInput = { estado: "PENDIENTE" }; 
    
    switch (rol) {
        case "JEFE":
            where = { estado: "PENDIENTE", jefeAprobadorId: null };
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
        default:
            return [];
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
        return solicitudes as unknown as SolicitudData[];
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
        return comunicados as unknown as ComunicadoData[];
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
        return eventos as unknown as EventoData[];
    } catch (error) {
        console.error("Error fetching upcoming eventos:", error);
        return [];
    }
}


// --- COMPONENTE SERVER (Obtiene datos) ---
export default async function DashboardPage() {
    const user = await getUserFromTokenSC(); 
    
    if (!user) {
        redirect('/'); 
    }

    const [pendingSolicitudes, latestComunicados, upcomingEventos] = await Promise.all([
        getPendingSolicitudes(user.id, user.rol),
        getLatestComunicados(),
        getUpcomingEventos(),
    ]);

    // Renderizamos el componente cliente
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
    const hasPendingSolicitudes = pendingSolicitudes.length > 0;

    const getPendingTasks = () => {
        const isApprover = ["JEFE", "DIRECCION", "SUBDIRECCION", "ADMIN"].includes(userRol);
        const count = pendingSolicitudes.length; 
        
        if (isApprover) {
             const baseHref = '/dashboard/solicitudes';
             let label = count > 0 ? `Revisar ${count} Tarea(s) Pendiente(s)` : 'Todo al día';
             let color = count > 0 ? 'red' : 'green';

             if (userRol === Role.SUBDIRECCION) {
                 label = count > 0 ? `Revisar Solicitudes (${count}) y Licencias` : 'Gestionar Licencias y Avisos';
                 color = 'purple';
             }
             
             return { label, href: baseHref, color: `border-${color}-500` };
        } else {
             return { label: 'Ver estado de mis solicitudes', href: '/dashboard/solicitudes', color: 'border-blue-500' };
        }
    };
    
    const pendingTasks = getPendingTasks();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Panel General de la Intranet 🏠</h1>
            <p className="text-gray-600 mb-8">
                Bienvenido de vuelta, {user.nombre} ({user.rol}). Aquí tienes un resumen rápido de tu actividad.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. WIDGET DE NOTIFICACIONES/TAREAS (MIS TAREAS) */}
                <Card className="lg:col-span-1" style={{ borderLeft: `4px solid ${pendingTasks.color.split('-')[1]}` }}>
                    <h2 className="text-xl font-semibold mb-3 text-gray-700">Mi Panel de Rol</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Tus prioridades como **{userRol}**:
                    </p>
                    <Link href={pendingTasks.href} className={`block p-3 rounded-md text-center font-bold text-white bg-blue-600 hover:bg-blue-700 transition`}>
                        {pendingTasks.label} →
                    </Link>
                </Card>
                
                {/* 2. WIDGET DE COMUNICACIÓN (Últimos Comunicados) */}
                <Card className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-3 text-gray-700">📣 Comunicados Recientes</h2>
                    <div className="space-y-3">
                        {latestComunicados.length === 0 ? (
                            <p className="text-gray-500 italic">No hay comunicados recientes.</p>
                        ) : (
                            latestComunicados.map((c) => (
                                <ComunicadoCard key={c.id} comunicado={c as any} />
                            ))
                        )}
                    </div>
                    <Link href="/dashboard/comunicados" className="mt-4 block text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Ver todos los comunicados
                    </Link>
                </Card>

                {/* 3. WIDGET DE TIEMPO (Próximos Eventos) */}
                <Card className="lg:col-span-3">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">📅 Próximos Eventos y Feriados</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {upcomingEventos.length === 0 ? (
                            <p className="text-gray-500 italic">No hay eventos próximos.</p>
                        ) : (
                            upcomingEventos.map((e) => (
                                <EventoCard key={e.id} evento={e as any} />
                            ))
                        )}
                    </div>
                    <Link href="/dashboard/calendario" className="mt-4 block text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Ver Calendario Completo →
                    </Link>
                </Card>
            </div>

            {/* Sección de enlaces rápidos para Administradores/Dirección */}
            {["DIRECCION", "ADMIN"].includes(user.rol) && (
                <div className="mt-10 bg-indigo-50 p-6 rounded-lg shadow-inner border border-indigo-200">
                    <h2 className="text-xl font-semibold text-indigo-700 mb-4">Enlaces de Administración</h2>
                    <div className="flex space-x-4">
                        <Link href="/dashboard/admin" className="text-indigo-600 hover:text-indigo-800 font-medium underline">
                            Gestión de Usuarios
                        </Link>
                        <Link href="/dashboard/licencias" className="text-indigo-600 hover:text-indigo-800 font-medium underline">
                            Revisión de Licencias
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
