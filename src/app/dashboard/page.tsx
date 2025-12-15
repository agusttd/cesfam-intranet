'use client';

import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfWeek, subWeeks, addWeeks, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { Role, API_URL } from "@/lib/constants";
import { getToken } from '@/lib/auth';
import { SolicitudCard, ComunicadoCard, EventoCard } from "@/components/DashboardCards";

// --- Interfaces ---
interface UsuarioDashboard { 
    id: number; 
    rol: string; 
    nombre: string; 
    diasVacaciones: number; 
    diasAdministrativos: number; 
}
interface SolicitudData { id: number; tipo: string; fechaInicio: string; fechaFin: string; estado: string; solicitante: { nombre: string }; }
interface ComunicadoData { id: number; titulo: string; contenido: string; createdAt: string; autor: { nombre: string }; }
interface EventoData { id: number; titulo: string; fechaInicio: string; esFeriado: boolean; }
interface FeriadoAPI { nombre: string; comentarios: string; fecha: string; irrenunciable: string; tipo: string; }
interface FeriadoNacional { fecha: string; nombre: string; }
interface LocalCardProps { children: React.ReactNode; className?: string; style?: React.CSSProperties; }

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<UsuarioDashboard | null>(null);
    const [pendingSolicitudes, setPendingSolicitudes] = useState<SolicitudData[]>([]);
    const [latestComunicados, setLatestComunicados] = useState<ComunicadoData[]>([]);
    const [upcomingEventos, setUpcomingEventos] = useState<EventoData[]>([]);
    const [feriadosNacionales, setFeriadosNacionales] = useState<FeriadoNacional[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estado para la navegación del calendario
    const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
    const [today, setToday] = useState<Date | null>(null);

    // Feriados Backup (Por si falla la API del gobierno)
    const FERIADOS_BACKUP: FeriadoNacional[] = [
        { fecha: '2025-01-01', nombre: 'Año Nuevo' },
        { fecha: '2025-04-18', nombre: 'Viernes Santo' },
        { fecha: '2025-04-19', nombre: 'Sábado Santo' },
        { fecha: '2025-05-01', nombre: 'Día del Trabajador' },
        { fecha: '2025-05-21', nombre: 'Glorias Navales' },
        { fecha: '2025-06-20', nombre: 'Pueblos Indígenas' },
        { fecha: '2025-06-29', nombre: 'San Pedro y San Pablo' },
        { fecha: '2025-07-16', nombre: 'Virgen del Carmen' },
        { fecha: '2025-08-15', nombre: 'Asunción de la Virgen' },
        { fecha: '2025-09-18', nombre: 'Independencia Nacional' },
        { fecha: '2025-09-19', nombre: 'Glorias del Ejército' },
        { fecha: '2025-10-12', nombre: 'Encuentro de Dos Mundos' },
        { fecha: '2025-10-31', nombre: 'Iglesias Evangélicas' },
        { fecha: '2025-11-01', nombre: 'Día de Todos los Santos' },
        { fecha: '2025-12-08', nombre: 'Inmaculada Concepción' },
        { fecha: '2025-12-25', nombre: 'Navidad' },
    ];

    useEffect(() => {
        setToday(new Date()); // Para evitar error de hidratación con la fecha
        
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const token = getToken();
            
            if (!token) {
                router.replace('/');
                return;
            }

            try {
                // 1. Cargar Perfil
                const meRes = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (meRes.ok) {
                    setUser(await meRes.json());
                } else {
                    // Si falla /me (ej. token viejo), usamos placeholder
                    // setUser({ id: 0, rol: 'FUNCIONARIO', nombre: 'Usuario', diasVacaciones: 0, diasAdministrativos: 0 });
                    throw new Error("Sesión inválida");
                }

                // 2. Cargar Datos
                const [solRes, comRes, eveRes] = await Promise.all([
                    fetch(`${API_URL}/solicitudes?status=pending&limit=5`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/comunicados?limit=3`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_URL}/eventos?upcoming=true&limit=4`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (solRes.ok) setPendingSolicitudes(await solRes.json());
                if (comRes.ok) setLatestComunicados(await comRes.json());
                if (eveRes.ok) setUpcomingEventos(await eveRes.json());

                // 3. Cargar Feriados
                let todosFeriados = [...FERIADOS_BACKUP];
                try {
                    const currentYear = new Date().getFullYear();
                    const feriadosRes = await fetch(`https://apis.digital.gob.cl/fl/feriados/${currentYear}`);
                    if (feriadosRes.ok) {
                        const data: FeriadoAPI[] = await feriadosRes.json();
                        todosFeriados = data.map(f => ({ fecha: f.fecha, nombre: f.nombre }));
                    }
                } catch (e) { console.warn("Usando backup feriados"); }
                
                setFeriadosNacionales(todosFeriados.filter(f => new Date(f.fecha) >= new Date(new Date().setHours(0,0,0,0))));

            } catch (err: unknown) {
                console.error(err);
                setError("Error cargando datos.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    // Navegación del Calendario Widget
    const prevWeek = () => setCurrentWeekDate(subWeeks(currentWeekDate, 1));
    const nextWeek = () => setCurrentWeekDate(addWeeks(currentWeekDate, 1));
    const resetWeek = () => setCurrentWeekDate(new Date());

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando panel...</div>;
    if (!user) return null;

    const Card = ({ children, className = '', style }: LocalCardProps) => (
        <div className={`bg-white p-5 rounded-lg shadow-md ${className}`} style={style}>{children}</div>
    );

    const userRol = user.rol as Role;
    const isApprover = [Role.JEFE, Role.DIRECCION, Role.SUBDIRECCION, Role.ADMIN].includes(userRol);
    const pendingCount = pendingSolicitudes.length;

    let taskLabel = isApprover ? (pendingCount > 0 ? `Revisar ${pendingCount} Pendiente(s)` : 'Revisar Solicitudes') : (pendingCount > 0 ? `Ver mis ${pendingCount} Solicitud(es)` : 'Ver mis Solicitudes');
    let taskColor = (isApprover && pendingCount > 0) ? 'border-red-500' : 'border-blue-500';
    
    // Lógica del Calendario Semanal
    const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 0 }); // Domingo
    
    const combinedEventsForList = [
        ...upcomingEventos.map(e => ({ ...e, type: 'evento', dateObj: parseISO(e.fechaInicio) })),
        ...feriadosNacionales.map((f, i) => ({ id: -i, titulo: f.nombre, fechaInicio: f.fecha, esFeriado: true, type: 'feriado', dateObj: parseISO(f.fecha) }))
    ].filter(e => e.dateObj >= weekStart && e.dateObj <= addDays(weekStart, 14)) // Mostrar eventos de 2 semanas
     .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
     .slice(0, 6);

    return (
        <div className="p-6 md:p-8 space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Hola, {user.nombre} </h1>
                    <p className="text-gray-600">Bienvenido a la Intranet.</p>
                </div>
                <div className="text-sm text-gray-500 font-medium hidden md:block">
                    {today ? format(today, "EEEE d 'de' MMMM", { locale: es }) : ''}
                </div>
            </header>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-6 text-sm">{error}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-8 lg:col-span-1">
                    <Card className="border-l-4 border-green-500">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">Mis Días Disponibles 🏖️</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                                <span className="block text-3xl font-bold text-green-700">{user.diasVacaciones ?? '-'}</span>
                                <span className="text-xs text-green-800 uppercase font-bold tracking-wide">Vacaciones</span>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <span className="block text-3xl font-bold text-blue-700">{user.diasAdministrativos ?? '-'}</span>
                                <span className="text-xs text-blue-800 uppercase font-bold tracking-wide">Admin.</span>
                            </div>
                        </div>
                    </Card>

                    <Card className={`border-l-4 ${taskColor}`}>
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">Tu Actividad</h2>
                        <Link href="/dashboard/solicitudes" className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center font-semibold rounded transition">
                            {taskLabel} →
                        </Link>
                    </Card>
                </div>

                {/* COLUMNA CENTRAL Y DERECHA */}
                <div className="space-y-8 lg:col-span-2">
                    
                    {/* WIDGET CALENDARIO */}
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-700">📅 Agenda Semanal</h2>
                            
                            {/* Controles de Navegación y Enlace "Ver todo" */}
                            <div className="flex items-center gap-4">
                                <Link href="/dashboard/calendario" className="text-sm text-blue-500 hover:underline hidden sm:block">
                                    Ver todo
                                </Link>
                                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg text-xs">
                                    <button onClick={prevWeek} className="px-2 py-1 hover:bg-white rounded transition">◀</button>
                                    <button onClick={resetWeek} className="px-2 py-1 font-bold text-blue-700 hover:bg-white rounded transition">Hoy</button>
                                    <button onClick={nextWeek} className="px-2 py-1 hover:bg-white rounded transition">▶</button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-2 text-center text-sm font-medium text-blue-600 bg-blue-50 py-2 rounded-md">
                            Semana del {format(weekStart, "d 'de' MMMM", { locale: es })}
                        </div>

                        {/* Grilla de la Semana */}
                        <div className="grid grid-cols-7 gap-1 mb-4 text-center">
                            {['D','L','M','M','J','V','S'].map(d => <div key={d} className="text-xs text-gray-400 font-bold">{d}</div>)}
                            {Array.from({ length: 7 }).map((_, i) => {
                                const d = addDays(weekStart, i);
                                const isTodayDate = isSameDay(d, new Date());
                                const dateStr = format(d, 'yyyy-MM-dd');
                                const hasEvent = upcomingEventos.some(e => e.fechaInicio.startsWith(dateStr));
                                const isFeriado = feriadosNacionales.some(f => f.fecha === dateStr);
                                return (
                                    <div key={i} className={`p-2 rounded-lg flex flex-col items-center transition ${isTodayDate ? 'bg-blue-600 text-white shadow-lg transform scale-105' : 'bg-gray-50'} ${isFeriado && !isTodayDate ? 'bg-red-50 text-red-600' : ''}`}>
                                        <span className="text-sm font-bold">{format(d, 'd')}</span>
                                        <div className="flex mt-1 space-x-0.5 h-1.5">
                                            {isFeriado && <span className={`w-1.5 h-1.5 rounded-full ${isTodayDate ? 'bg-red-300' : 'bg-red-500'}`}></span>}
                                            {hasEvent && <span className={`w-1.5 h-1.5 rounded-full ${isTodayDate ? 'bg-blue-300' : 'bg-blue-500'}`}></span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="space-y-2">
                            {combinedEventsForList.map((e, idx) => (
                                <div key={idx} className={`flex items-center text-sm p-2 rounded border-l-4 ${e.esFeriado ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}`}>
                                    <span className="font-bold text-gray-700 w-12 flex-shrink-0">{format(e.dateObj, 'dd/MM')}</span>
                                    <span className="truncate text-gray-800 flex-1 font-medium">{e.titulo}</span>
                                    {e.esFeriado && <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full ml-2">FERIADO</span>}
                                </div>
                            ))}
                            {combinedEventsForList.length === 0 && <p className="text-center text-xs text-gray-400 italic py-2">Sin eventos cercanos.</p>}
                        </div>
                    </Card>

                    {/* WIDGET: Comunicados */}
                    <Card>
                         <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-700">📣 Comunicados</h2>
                            <Link href="/dashboard/comunicados" className="text-sm text-blue-500 hover:underline">Ver todos</Link>
                        </div>
                        <div className="space-y-3">
                            {latestComunicados.length === 0 ? <p className="text-gray-400 text-sm italic">Sin novedades.</p> : latestComunicados.map(c => <ComunicadoCard key={c.id} comunicado={{ ...c, fechaPublicacion: c.createdAt }} />)}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}