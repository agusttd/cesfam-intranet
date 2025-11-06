'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken } from '@/lib/auth';
import { API_URL, Role } from '@/lib/constants';
import { Evento } from '@/lib/types'; 
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Estilos por defecto


// Componentes reutilizables
interface CardProps { children: React.ReactNode }
const Card = ({ children }: Readonly<CardProps>) => <div className="bg-white p-6 rounded-lg shadow-md">{children}</div>;

interface ButtonProps { 
    children: React.ReactNode; 
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
    disabled?: boolean; 
    className?: string; 
    type?: 'button' | 'submit' | 'reset';
}
const Button = ({ children, onClick, disabled, className = '', type = 'button' }: Readonly<ButtonProps>) => (
    <button 
        type={type} 
        onClick={onClick} 
        disabled={disabled} 
        className={`px-4 py-2 rounded text-white font-semibold transition ${disabled ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} ${className}`}
    >
        {children}
    </button>
);


export default function CalendarioPage() {
    const userRol = getRol() as Role;
    // Roles que pueden crear eventos (ADMIN, DIRECCION, SUBDIRECCION)
    const canCreate = [Role.ADMIN, Role.DIRECCION, Role.SUBDIRECCION].includes(userRol);

    // Estado para la fecha seleccionada en el calendario
    const [date, setDate] = useState(new Date());

    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchEventos = async () => {
        setLoading(true);
        try {
            // Llama a la ruta GET /api/eventos
            const response = await fetch(`${API_URL}/eventos`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });
            if (!response.ok) throw new Error('Error al cargar el calendario');
            const data: Evento[] = await response.json();
            setEventos(data);
        } catch (e) {
            console.error("Error al obtener eventos:", e); 
            setError('Error al cargar el calendario institucional.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEventos();
    }, []);

    // Formatea la fecha para mostrar el día, mes y año de forma amigable.
    const formatFullDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    };

    // --- Función para marcar días en el calendario ---
    const tileClassName = ({ date, view }: { date: Date, view: string }) => {
        if (view === 'month') {
            // Comprueba si esta fecha tiene un evento
            const hasEvent = eventos.some(
                (event) => new Date(event.fechaInicio).toDateString() === date.toDateString()
            );
            // Comprueba si es feriado
             const isFeriado = eventos.some(
                (event) => new Date(event.fechaInicio).toDateString() === date.toDateString() && event.esFeriado
            );

            if (isFeriado) {
                 return 'highlight-feriado'; // Clase CSS para feriados (ej. rojo)
            }
            if (hasEvent) {
                return 'highlight-event'; // Clase CSS para eventos (ej. azul)
            }
        }
        return null;
    };


    // --- Lógica de Renderizado del Listado de Eventos (HU-06) ---
    let content;
    if (loading) {
        content = <p>Cargando calendario y feriados...</p>;
    } else if (error) {
        content = <p className="text-red-500">{error}</p>;
    } else if (eventos.length === 0) {
        content = <p className="text-gray-500 italic">No hay actividades programadas.</p>;
    } else {
        // Filtramos para mostrar solo eventos futuros en la lista
        const upcomingEvents = eventos
            .filter(e => new Date(e.fechaInicio) >= new Date(new Date().setHours(0,0,0,0)))
            .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());

        if (upcomingEvents.length === 0) {
             content = <p className="text-gray-500 italic">No hay actividades programadas para los próximos meses.</p>
        } else {
            content = (
                <ul className="space-y-4">
                    {upcomingEvents.map((evento) => (
                        <li key={evento.id} className={`p-4 rounded-lg flex items-start space-x-4 ${evento.esFeriado ? 'bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                            {/* Indicador de Fecha y Tipo */}
                            <div className={`flex-shrink-0 w-24 text-center p-2 rounded-md ${evento.esFeriado ? 'bg-red-400 text-white font-bold' : 'bg-blue-200 text-blue-900 font-medium'}`}>
                                {/* Usamos timeZone: 'UTC' para evitar desfase de día */}
                                <p className="text-lg leading-none">{new Date(evento.fechaInicio).getUTCDate()}</p> 
                                <p className="text-xs uppercase">{new Date(evento.fechaInicio).toLocaleDateString('es-CL', { month: 'short', timeZone: 'UTC' })}</p>
                            </div>
                            
                            {/* Detalle del Evento */}
                            <div className="flex-grow">
                                <h3 className="text-lg font-semibold text-gray-900">{evento.titulo}</h3>
                                <p className="text-sm text-gray-700">{evento.descripcion || 'Actividad sin detalles.'}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatFullDate(evento.fechaInicio)} 
                                    {evento.fechaFin && ` - ${formatFullDate(evento.fechaFin)}`}
                                </p>
                            </div>
                            {/* Placeholder para Acciones de Admin (Ej. Editar) */}
                            {canCreate && (
                                 <button className="text-sm text-blue-500 hover:text-blue-700 ml-auto">Editar</button>
                            )}
                        </li>
                    ))}
                </ul>
            );
        }
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">📅 Calendario Institucional (HU-06)</h1>
            <p className="text-gray-600">
                Consulta feriados, actividades programadas y reuniones administrativas.
            </p>

            {/* Módulo de Creación para roles administrativos */}
            {canCreate && (
                 <Card>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Administrar Eventos y Feriados</h2>
                    <Button onClick={() => alert('Aquí debes abrir un Modal/Formulario para crear eventos')}>
                        + Crear Nuevo Evento/Feriado
                    </Button>
                </Card>
            )}

            {/* --- Calendario Visual Integrado --- */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Calendario Mensual</h2>
                <div className="flex justify-center p-2">
                    <Calendar
                        // Solución al warning: onChange={(value) => setDate(value as Date)}
                        onChange={setDate as any} 
                        value={date}
                        tileClassName={tileClassName}
                        locale="es-ES" // Opcional: para ponerlo en español
                    />
                </div>
            </Card>

            {/* Visualización del Listado de Próximos Eventos */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Próximos Eventos y Actividades</h2>
                {content}
            </Card>

            {/* CSS Opcional: Añade esto en tu archivo .css global (ej. src/app/globals.css) */}
            {/* .highlight-event {
                background-color: #e0e7ff; // Un azul claro
                border-radius: 99px;
            }
            .highlight-feriado {
                 background-color: #fee2e2; // Un rojo claro
                 border-radius: 99px;
                 font-weight: bold;
            }
            .react-calendar__tile--now {
                 background: #f0f0f0; // Resaltar día actual
            }
            */}
        </div>
    );
}