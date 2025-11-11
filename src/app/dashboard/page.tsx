'use client';

import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfWeek, subWeeks, addWeeks, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { Role, API_URL } from "@/lib/constants";
import { getRol, getToken } from '@/lib/auth';
import { SolicitudCard, ComunicadoCard, EventoCard } from "@/components/DashboardCards";

// --- Interfaces ---
interface UsuarioDashboard { id: number; rol: string; nombre: string; }
interface SolicitudData { id: number; tipo: string; fechaInicio: string; fechaFin: string; estado: string; solicitante: { nombre: string }; }
interface ComunicadoData { id: number; titulo: string; contenido: string; createdAt: string; autor: { nombre: string }; }
interface EventoData { id: number; titulo: string; fechaInicio: string; esFeriado: boolean; }
interface FeriadoAPI { nombre: string; comentarios: string; fecha: string; irrenunciable: string; tipo: string; }
interface FeriadoNacional { fecha: string; nombre: string; }

// --- Interfaz para el componente Card local (Soluciona el error de la imagen a18c1f) ---
interface LocalCardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UsuarioDashboard | null>(null);
    const [pendingSolicitudes, setPendingSolicitudes] = useState<SolicitudData[]>([]);
    const [latestComunicados, setLatestComunicados] = useState<ComunicadoData[]>([]);
    const [upcomingEventos, setUpcomingEventos] = useState<EventoData[]>([]);
    const [feriadosNacionales, setFeriadosNacionales] = useState<FeriadoNacional[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentWeekDate, setCurrentWeekDate] = useState(new Date());

    // --- LISTA FIJA DE FERIADOS (Backup por si falla la API) ---
    const FERIADOS_BACKUP: FeriadoNacional[] = [
        { fecha: '2025-01-01', nombre: 'Año Nuevo' },
        { fecha: '2025-04-18', nombre: 'Viernes Santo' },
        { fecha: '2025-04-19', nombre: 'Sábado Santo' },
        { fecha: '2025-05-01', nombre: 'Día del Trabajador' },
        { fecha: '2025-05-21', nombre: 'Día de las Glorias Navales' },
        { fecha: '2025-06-20', nombre: 'Día Nacional de los Pueblos Indígenas' },
        { fecha: '2025-06-29', nombre: 'San Pedro y San Pablo' },
        { fecha: '2025-07-16', nombre: 'Día de la Virgen del Carmen' },
        { fecha: '2025-08-15', nombre: 'Asunción de la Virgen' },
        { fecha: '2025-09-18', nombre: 'Independencia Nacional' },
        { fecha: '2025-09-19', nombre: 'Día de las Glorias del Ejército' },
        { fecha: '2025-10-12', nombre: 'Encuentro de Dos Mundos' },
        { fecha: '2025-10-31', nombre: 'Día de las Iglesias Evangélicas' },
        { fecha: '2025-11-01', nombre: 'Día de Todos los Santos' },
        { fecha: '2025-12-08', nombre: 'Inmaculada Concepción' },
        { fecha: '2025-12-25', nombre: 'Navidad' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const token = getToken();
            const rol = getRol();

            if (!token || !rol) {
                router.replace('/');
                return;
            }

            setUser({ id: 0, rol: rol, nombre: `Usuario (${rol})` });

            try {
                // 1. Cargar datos internos
                const [solRes, comRes, eveRes] = await Promise.all([
                    fetch(`${API_URL}/solicitudes?status=pending&limit=5`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/comunicados?limit=3`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/eventos?upcoming=true&limit=4`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (solRes.ok) setPendingSolicitudes(await solRes.json());
                if (comRes.ok) setLatestComunicados(await comRes.json());
                if (eveRes.ok) setUpcomingEventos(await eveRes.json());

                // 2. Cargar Feriados (Intento de API real con fallback a lista fija)
                let todosFeriados: FeriadoNacional[] = [];
                const currentYear = new Date().getFullYear();
                try {
                    const feriadosRes = await fetch(`https://apis.digital.gob.cl/fl/feriados/${currentYear}`);
                    if (feriadosRes.ok) {
                        const data: FeriadoAPI[] = await feriadosRes.json();
                        todosFeriados = data.map(f => ({ fecha: f.fecha, nombre: f.nombre }));
                    } else {
                        throw new Error("API feriados falló");
                    }
                } catch (err) {
                    console.warn("Usando feriados de respaldo:", err);
                    todosFeriados = FERIADOS_BACKUP;
                }
                
                setFeriadosNacionales(todosFeriados.filter(f => new Date(f.fecha) >= new Date(new Date().setHours(0,0,0,0))));

            } catch (err: unknown) {
                if (err instanceof Error) console.error("Error fetch dashboard:", err.message);
                setError("Error al cargar algunos datos.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const prevWeek = () => setCurrentWeekDate(subWeeks(currentWeekDate, 1));
    const nextWeek = () => setCurrentWeekDate(addWeeks(currentWeekDate, 1));
    const resetWeek = () => setCurrentWeekDate(new Date());

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando panel...</div>;
    if (!user) return null;

    // --- Componente Card Local con Tipos Corregidos ---
    const Card = ({ children, className = '', style }: LocalCardProps) => (
        <div className={`bg-white p-5 rounded-lg shadow-md ${className}`} style={style}>
            {children}
        </div>
    );

    const userRol = user.rol as Role;
    const isApprover = [Role.JEFE, Role.DIRECCION, Role.SUBDIRECCION, Role.ADMIN].includes(userRol);
    const pendingCount = pendingSolicitudes.length;

    let taskLabel = isApprover ? (pendingCount > 0 ? `Revisar ${pendingCount} Pendiente(s)` : 'Revisar Solicitudes') : (pendingCount > 0 ? `Ver mis ${pendingCount} Solicitud(es)` : 'Ver mis Solicitudes');
    let taskColor = (isApprover && pendingCount > 0) ? 'border-red-500' : 'border-blue-500';
    let taskHref = '/dashboard/solicitudes';

    const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 6);
    
    // Combinar eventos y feriados para la lista
    // Ajuste: Usamos parseISO para asegurar que la fecha se interprete correctamente
    const combinedEventsForList = [
        ...upcomingEventos.map(e => ({ ...e, type: 'evento', dateObj: parseISO(e.fechaInicio) })),
        ...feriadosNacionales.map((f, i) => ({ 
            id: -i, 
            titulo: f.nombre, 
            fechaInicio: f.fecha, 
            esFeriado: true, 
            type: 'feriado', 
            dateObj: parseISO(f.fecha) 
        }))
    ].filter(e => e.dateObj >= weekStart && e.dateObj <= addDays(weekEnd, 14))
     .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
     .slice(0, 6);

    return (
        <div className="p-6 md:p-8 space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Hola, {user.nombre} 👋</h1>
                    <p className="text-gray-600">Bienvenido a la Intranet.</p>
                </div>
                 <div className="text-sm text-gray-500 font-medium">
                    {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
                </div>
            </header>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-6 text-sm">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* WIDGET 1: Tareas / Rol */}
                <Card className={`lg:col-span-1 border-l-4 ${taskColor}`}>
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">Tu Actividad</h2>
                    <Link href={taskHref} className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded transition">
                        {taskLabel} →
                    </Link>
                </Card>

                {/* WIDGET 2: Comunicados */}
                <Card className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-700">📣 Últimos Comunicados</h2>
                        <Link href="/dashboard/comunicados" className="text-sm text-blue-500 hover:underline">Ver todos</Link>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                        {latestComunicados.length === 0 ? (
                            <p className="text-gray-400 italic text-sm">Sin novedades.</p>
                        ) : (
                            latestComunicados.map(c => (
                                <ComunicadoCard key={c.id} comunicado={{ ...c, fechaPublicacion: c.createdAt }} />
                            ))
                        )}
                    </div>
                </Card>

                {/* WIDGET 3: Mini Calendario con Navegación */}
                <Card className="lg:col-span-3">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">📅 Agenda Institucional</h2>
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                            <button onClick={prevWeek} className="px-3 py-1 text-gray-600 hover:bg-white rounded-md transition">◀</button>
                            <button onClick={resetWeek} className="px-3 py-1 text-sm font-medium text-blue-700 hover:bg-white rounded-md transition">Hoy</button>
                            <button onClick={nextWeek} className="px-3 py-1 text-gray-600 hover:bg-white rounded-md transition">▶</button>
                        </div>
                    </div>
                    
                    <div className="mb-2 text-center text-sm font-medium text-blue-600 bg-blue-50 py-2 rounded-md">
                        Semana del {format(weekStart, "d 'de' MMMM", { locale: es })}
                    </div>
                    <div className="grid grid-cols-7 gap-2 mb-8 text-center">
                        {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(d => <div key={d} className="text-xs font-bold text-gray-400 uppercase">{d}</div>)}
                        {Array.from({ length: 7 }).map((_, i) => {
                            const d = addDays(weekStart, i);
                            const isToday = isSameDay(d, new Date());
                            // IMPORTANTE: Usar el formato ISO para comparar con lo que viene de la API/Feriados
                            const dateStr = format(d, 'yyyy-MM-dd'); 
                            
                            const hasEvent = upcomingEventos.some(e => e.fechaInicio.startsWith(dateStr));
                            const isFeriado = feriadosNacionales.some(f => f.fecha === dateStr);

                            return (
                                <div key={i} className={`flex flex-col items-center p-3 rounded-xl transition ${isToday ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-50 hover:bg-gray-100'} ${isFeriado && !isToday ? 'bg-red-50 text-red-700' : ''}`}>
                                    <span className={`text-lg font-bold ${isToday ? 'text-white' : (isFeriado ? 'text-red-600' : 'text-gray-700')}`}>{format(d, 'd')}</span>
                                    <div className="flex mt-2 space-x-1 h-2">
                                        {isFeriado && <span className={`w-2 h-2 rounded-full ${isToday ? 'bg-red-300' : 'bg-red-500'}`} title="Feriado"></span>}
                                        {hasEvent && <span className={`w-2 h-2 rounded-full ${isToday ? 'bg-blue-300' : 'bg-blue-500'}`} title="Evento"></span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <h3 className="text-base font-semibold text-gray-700 mb-4 flex items-center">
                        📌 Próximas Actividades <span className="ml-2 text-xs font-normal text-gray-500">(próximas 3 semanas)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {combinedEventsForList.length === 0 ? (
                            <p className="text-gray-400 italic col-span-full py-4 text-center bg-gray-50 rounded-lg">No hay eventos programados para estas fechas.</p>
                        ) : (
                            combinedEventsForList.map((e, idx) => (
                                <div key={`${e.type}-${e.id || idx}`} className={`flex items-center p-4 rounded-xl border-l-4 shadow-sm transition hover:shadow-md ${e.esFeriado ? 'bg-red-50 border-red-500' : 'bg-white border-blue-500'}`}>
                                    <div className={`text-center mr-4 min-w-[3.5rem]`}>
                                        <span className={`block text-xs font-bold uppercase tracking-wider ${e.esFeriado ? 'text-red-600' : 'text-blue-600'}`}>{format(e.dateObj, 'MMM', { locale: es })}</span>
                                        <span className={`block text-2xl font-extrabold leading-none ${e.esFeriado ? 'text-red-800' : 'text-gray-800'}`}>{format(e.dateObj, 'd')}</span>
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-gray-800 leading-tight truncate" title={e.titulo}>{e.titulo}</p>
                                        {e.esFeriado && <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 rounded-full">FERIADO</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="mt-6 text-right">
                        <Link href="/dashboard/calendario" className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition hover:bg-blue-100">
                            Ver calendario completo →
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}