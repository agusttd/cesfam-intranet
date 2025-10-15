'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken } from '@/lib/auth';
import { API_URL, Role } from '@/lib/constants';
import { Evento } from '@/lib/types'; 

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

    // --- Lógica de Renderizado del Contenido (HU-06) ---
    let content;
    if (loading) {
        content = <p>Cargando calendario y feriados...</p>;
    } else if (error) {
        content = <p className="text-red-500">{error}</p>;
    } else if (eventos.length === 0) {
        content = <p className="text-gray-500 italic">No hay actividades programadas para los próximos meses.</p>
    } else {
        content = (
            <ul className="space-y-4">
                {eventos.map((evento) => (
                    <li key={evento.id} className={`p-4 rounded-lg flex items-start space-x-4 ${evento.esFeriado ? 'bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        {/* Indicador de Fecha y Tipo */}
                        <div className={`flex-shrink-0 w-24 text-center p-2 rounded-md ${evento.esFeriado ? 'bg-red-400 text-white font-bold' : 'bg-blue-200 text-blue-900 font-medium'}`}>
                            <p className="text-lg leading-none">{new Date(evento.fechaInicio).getDate()}</p>
                            <p className="text-xs uppercase">{new Date(evento.fechaInicio).toLocaleDateString('es-CL', { month: 'short' })}</p>
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
                    <Button onClick={() => alert('Abrir formulario de creación de evento')}>
                        + Crear Nuevo Evento/Feriado
                    </Button>
                </Card>
            )}

            {/* Visualización del Calendario */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Próximos Eventos y Actividades</h2>
                {content}
            </Card>
        </div>
    );
}