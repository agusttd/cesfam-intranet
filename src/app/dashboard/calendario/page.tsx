'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken } from '@/lib/auth';
import { API_URL, Role } from '@/lib/constants';
import { Evento } from '@/lib/types';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, parseISO, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface CardProps { children: React.ReactNode; className?: string }
const Card = ({ children, className = '' }: CardProps) => <div className={`bg-white p-6 rounded-xl shadow-md ${className}`}>{children}</div>;
const Button = ({ children, onClick }: any) => (<button onClick={onClick} className="px-4 py-2 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition shadow">{children}</button>);

// Lista fija de feriados (Misma que en el dashboard)
const FERIADOS_NACIONALES = [
    { fecha: '2025-01-01', nombre: 'Año Nuevo' }, { fecha: '2025-04-18', nombre: 'Viernes Santo' },
    { fecha: '2025-04-19', nombre: 'Sábado Santo' }, { fecha: '2025-05-01', nombre: 'Día del Trabajador' },
    { fecha: '2025-05-21', nombre: 'Glorias Navales' }, { fecha: '2025-06-20', nombre: 'Pueblos Indígenas' },
    { fecha: '2025-06-29', nombre: 'San Pedro y San Pablo' }, { fecha: '2025-07-16', nombre: 'Virgen del Carmen' },
    { fecha: '2025-08-15', nombre: 'Asunción de la Virgen' }, { fecha: '2025-09-18', nombre: 'Independencia' },
    { fecha: '2025-09-19', nombre: 'Glorias del Ejército' }, { fecha: '2025-10-12', nombre: 'Encuentro Dos Mundos' },
    { fecha: '2025-10-31', nombre: 'Iglesias Evangélicas' }, { fecha: '2025-11-01', nombre: 'Todos los Santos' },
    { fecha: '2025-12-08', nombre: 'Inmaculada Concepción' }, { fecha: '2025-12-25', nombre: 'Navidad' },
];

export default function CalendarioPage() {
    const userRol = getRol() as Role;
    const canCreate = [Role.ADMIN, Role.DIRECCION, Role.SUBDIRECCION].includes(userRol);
    const [date, setDate] = useState(new Date());
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEventos = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_URL}/eventos`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
                if (res.ok) setEventos(await res.json());
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchEventos();
    }, []);

    const tileClassName = ({ date: tileDate, view }: { date: Date, view: string }) => {
        if (view === 'month') {
            const dateStr = format(tileDate, 'yyyy-MM-dd');
            if (FERIADOS_NACIONALES.some(f => f.fecha === dateStr)) return 'highlight-feriado';
            if (eventos.some(e => e.fechaInicio.startsWith(dateStr))) return 'highlight-event';
        }
        return null;
    };

    // Combinar y filtrar eventos para la lista lateral (mes seleccionado)
    const eventsForSelectedMonth = [
        ...eventos.map(e => ({ ...e, type: 'evento', dateObj: parseISO(e.fechaInicio) })),
        ...FERIADOS_NACIONALES.map((f, i) => ({ id: -i, titulo: f.nombre, fechaInicio: f.fecha, esFeriado: true, type: 'feriado', dateObj: parseISO(f.fecha), descripcion: '' }))
    ].filter(e => isSameMonth(e.dateObj, date))
     .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    const selectedDayEvents = eventsForSelectedMonth.filter(e => isSameDay(e.dateObj, date));

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4">
            <div className="flex justify-between items-center">
                <div><h1 className="text-3xl font-bold text-gray-800">Calendario Institucional</h1><p className="text-gray-600">Actividades, feriados y reuniones.</p></div>
                {canCreate && <Button onClick={() => alert('Abrir Modal Crear Evento')}>+ Nuevo Evento</Button>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <Card className="lg:col-span-2 flex justify-center p-8">
                    {/* El calendario usará los estilos globales que ya definimos */}
                    <Calendar onChange={setDate as any} value={date} tileClassName={tileClassName} locale="es-ES" className="react-calendar-large" />
                </Card>

                <div className="space-y-6">
                    {/* Eventos del Día Seleccionado */}
                    <Card className={`border-t-4 ${selectedDayEvents.length > 0 ? 'border-blue-500' : 'border-gray-300'}`}>
                        <h2 className="text-lg font-bold text-gray-800 mb-3">
                            {format(date, "EEEE d 'de' MMMM", { locale: es })}
                        </h2>
                        {selectedDayEvents.length === 0 ? (
                            <p className="text-gray-500 italic text-sm">No hay actividades para este día.</p>
                        ) : (
                            <ul className="space-y-3">
                                {selectedDayEvents.map((e, i) => (
                                    <li key={i} className={`p-3 rounded-lg border-l-4 ${e.esFeriado ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'}`}>
                                        <p className="font-bold text-gray-900">{e.titulo}</p>
                                        {e.esFeriado && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">FERIADO</span>}
                                        {!e.esFeriado && e.descripcion && <p className="text-sm text-gray-600 mt-1">{e.descripcion}</p>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* Resumen del Mes */}
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            Eventos de {format(date, 'MMMM yyyy', { locale: es })}
                        </h2>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {eventsForSelectedMonth.length === 0 ? (
                                <p className="text-gray-500 italic">Sin actividades este mes.</p>
                            ) : (
                                eventsForSelectedMonth.map((e, idx) => (
                                    <div key={idx} className={`flex items-center p-3 rounded-lg ${isSameDay(e.dateObj, date) ? 'bg-blue-50 ring-2 ring-blue-200' : 'hover:bg-gray-50'}`}>
                                        <div className={`text-center w-12 mr-3 py-1 rounded-md ${e.esFeriado ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                            <span className="block text-lg font-bold leading-none">{format(e.dateObj, 'd')}</span>
                                            <span className="block text-[10px] font-bold uppercase">{format(e.dateObj, 'EEE', { locale: es })}</span>
                                        </div>
                                        <p className={`font-medium ${e.esFeriado ? 'text-red-700' : 'text-gray-700'}`}>{e.titulo}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}