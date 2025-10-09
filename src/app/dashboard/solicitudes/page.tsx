'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken } from '@/lib/auth';
import { API_URL, Role } from '@/lib/constants';
import { Solicitud, SolicitudTipo } from '@/lib/types'; 

// Componentes reutilizables con Tipado Limpio (Mantenidos fuera del componente principal)
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

interface SolicitudRowProps {
    solicitud: Solicitud;
    isApprover: boolean;
    userRol: Role;
    handleApproveReject: (solicitudId: number, accion: 'aprobar' | 'rechazar') => Promise<void>;
}

// Sub-Componente de botones de aprobación
const ApproverActions = ({ solicitud, userRol, handleApproveReject }: Omit<SolicitudRowProps, 'isApprover'>) => {
    const isJefe = userRol === Role.JEFE;
    const isDirection = [Role.DIRECCION, Role.SUBDIRECCION].includes(userRol);

    let canAct = false;
    
    // CORRECCIÓN S1871: Consolidar la lógica condicional que lleva a la misma acción
    const isJefeAction = isJefe && solicitud.jefeAprobadorId === null;
    const isDirectionAction = isDirection && solicitud.jefeAprobadorId !== null && solicitud.direccionAprobadorId === null;

    if (solicitud.estado === 'PENDIENTE' && (isJefeAction || isDirectionAction)) {
        canAct = true;
    }
    
    if (!canAct) return null;

    return (
        <div className="flex space-x-2">
            <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleApproveReject(solicitud.id, 'aprobar')}
            >
                Aprobar
            </Button>
            <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleApproveReject(solicitud.id, 'rechazar')}
            >
                Rechazar
            </Button>
        </div>
    );
};


// Componente de Fila de Solicitud
const SolicitudRow = ({ solicitud, isApprover, userRol, handleApproveReject }: Readonly<SolicitudRowProps>) => {
    const isOwn = !isApprover; 
    
    const statusMap = {
        'PENDIENTE': 'bg-yellow-100 text-yellow-800',
        'APROBADO': 'bg-green-100 text-green-800',
        'RECHAZADO': 'bg-red-100 text-red-800',
        'CANCELADO': 'bg-gray-100 text-gray-800',
    };
    const statusClass = statusMap[solicitud.estado];
        
    return (
        <li className="p-4 border-b last:border-b-0 flex justify-between items-center hover:bg-gray-50">
            <div>
                <p className="font-semibold text-gray-800">
                    {isOwn ? solicitud.tipo : `${solicitud.solicitante.nombre} - ${solicitud.tipo}`}
                </p>
                <p className="text-sm text-gray-600">
                    {new Date(solicitud.fechaInicio).toLocaleDateString()} al {new Date(solicitud.fechaFin).toLocaleDateString()}
                </p>
                {isApprover && (
                    <p className="text-xs text-gray-500">Motivo: {solicitud.motivo || 'N/A'}</p>
                )}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${statusClass}`}>
                    {solicitud.estado}
                </span>
            </div>
            {isApprover && <ApproverActions 
                solicitud={solicitud} 
                userRol={userRol} 
                handleApproveReject={handleApproveReject}
            />}
            {isOwn && solicitud.pdfUrl && ( 
                <a 
                    href={solicitud.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 font-medium text-sm"
                >
                    Descargar PDF
                </a>
            )}
        </li>
    );
};

// Componente Principal

export default function SolicitudesPage() {
    const userRol = getRol() as Role;
    const isApprover = [Role.JEFE, Role.DIRECCION, Role.SUBDIRECCION].includes(userRol); 
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);

    const [formTipo, setFormTipo] = useState<SolicitudTipo>('VACACIONES');
    const [formMotivo, setFormMotivo] = useState('');
    const [formInicio, setFormInicio] = useState('');
    const [formFin, setFormFin] = useState('');
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    const fetchSolicitudes = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/solicitudes`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });
            if (!response.ok) throw new Error('Error al cargar las solicitudes');
            const data = await response.json();
            setSolicitudes(data);
        } catch (e) {
            console.error("Error al obtener solicitudes:", e); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSolicitudes();
    }, []);
    
    // --- Lógica de Creación ---
    const handleCreateSolicitud = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!formInicio || !formFin || !formTipo) {
            setFormError('Debe completar al menos el tipo, fecha de inicio y fecha fin.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/solicitudes`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}` 
                },
                body: JSON.stringify({
                    tipo: formTipo,
                    motivo: formMotivo,
                    fechaInicio: formInicio,
                    fechaFin: formFin,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear la solicitud');
            }

            setFormMotivo('');
            setFormInicio('');
            setFormFin('');
            fetchSolicitudes();
            alert('Solicitud enviada con éxito.');

        } catch (error) { 
            if (error instanceof Error) {
                setFormError(error.message);
            } else {
                 setFormError("Ocurrió un error desconocido al enviar la solicitud.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- Lógica de Aprobación/Rechazo ---
    const handleApproveReject = async (solicitudId: number, accion: 'aprobar' | 'rechazar') => {
        if (!confirm(`¿Está seguro de ${accion} la solicitud ID ${solicitudId}?`)) return;

        try {
            const response = await fetch(`${API_URL}/solicitudes/${solicitudId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}` 
                },
                body: JSON.stringify({ accion }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error al ${accion} la solicitud`);
            }

            fetchSolicitudes(); 
            alert(`Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} con éxito.`);

        } catch (error) { 
             if (error instanceof Error) {
                alert(error.message);
            } else {
                 alert("Ocurrió un error desconocido al intentar aprobar/rechazar.");
            }
        }
    };

    // --- Definición del Título (Fix S3358) ---
    const listTitle = isApprover ? 'Solicitudes Pendientes de Aprobación (HU-04)' : 'Mis Solicitudes (HU-05)';
    const emptyMessage = isApprover ? 'No hay solicitudes pendientes en esta etapa.' : 'Aún no has enviado ninguna solicitud.';
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Gestión de Solicitudes Laborales</h1>

            {/* Formulario de Creación (Visible solo para Funcionarios - HU-05) */}
            {userRol === Role.FUNCIONARIO && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Crear Nueva Solicitud (HU-05)</h2>
                    <form onSubmit={handleCreateSolicitud} className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="solicitud-tipo">Tipo</label> 
                            <select 
                                id="solicitud-tipo"
                                value={formTipo} 
                                onChange={(e) => setFormTipo(e.target.value as SolicitudTipo)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            >
                                <option value="VACACIONES">Vacaciones</option>
                                <option value="ADMINISTRATIVO">Día Administrativo</option>
                            </select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="motivo">Motivo (Opcional)</label>
                            <input 
                                id="motivo"
                                type="text" 
                                value={formMotivo}
                                onChange={(e) => setFormMotivo(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="fecha-inicio">Fecha de Inicio</label>
                            <input 
                                id="fecha-inicio"
                                type="date" 
                                value={formInicio}
                                onChange={(e) => setFormInicio(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="fecha-fin">Fecha de Fin</label>
                            <input 
                                id="fecha-fin"
                                type="date" 
                                value={formFin}
                                onChange={(e) => setFormFin(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>
                        <div className="col-span-2">
                            {formError && <p className="text-red-500 text-sm mb-2">{formError}</p>}
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Lista de Solicitudes */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">
                    {listTitle}
                </h2>
                {loading ? (
                    <p>Cargando lista de solicitudes...</p>
                ) : solicitudes.length === 0 ? (
                    <p className="text-gray-500 italic">
                        {emptyMessage}
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {solicitudes.map((s) => (
                            <SolicitudRow 
                                key={s.id} 
                                solicitud={s}
                                isApprover={isApprover}
                                userRol={userRol}
                                handleApproveReject={handleApproveReject}
                            />
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}