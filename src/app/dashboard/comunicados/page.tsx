'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken, } from '@/lib/auth';
import { API_URL, Role } from '@/lib/constants';

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

// Tipado del Comunicado
interface Comunicado {
    id: number;
    titulo: string;
    contenido: string;
    autor: { nombre: string }; // Asumiendo que la API incluye el nombre del autor
    createdAt: string;
}

export default function ComunicadosPage() {
    const userRol = getRol() as Role;
    // Roles con permiso para publicar (HU-07)
    const canPublish = [Role.ADMIN, Role.SUBDIRECCION, Role.DIRECCION].includes(userRol);
    
    const [comunicados, setComunicados] = useState<Comunicado[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Estados para el formulario de publicación
    const [newTitulo, setNewTitulo] = useState('');
    const [newContenido, setNewContenido] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const fetchComunicados = async () => {
        setLoading(true);
        try {
            // Llama a la ruta GET /api/comunicados
            const response = await fetch(`${API_URL}/comunicados`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });
            if (!response.ok) throw new Error('No se pudieron cargar los comunicados');
            const data: Comunicado[] = await response.json();
            setComunicados(data);
        } catch (e) {
            console.error("Error al obtener comunicados:", e); 
            setError('Error al obtener los comunicados oficiales.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComunicados();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (!newTitulo || !newContenido) {
            setSubmitError('El título y el contenido son obligatorios.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Llama a la ruta POST /api/comunicados
            // NOTA: Tu API backend (route.ts) debe ser capaz de extraer el autorId 
            // y el rol del JWT para esta solicitud, por seguridad.
            const response = await fetch(`${API_URL}/comunicados`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}` 
                },
                body: JSON.stringify({ titulo: newTitulo, contenido: newContenido }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al publicar el comunicado');
            }

            // Éxito
            setNewTitulo('');
            setNewContenido('');
            fetchComunicados(); // Recargar la lista
            alert('Comunicado publicado con éxito.');
            
        } catch (error) {
            if (error instanceof Error) {
                setSubmitError(error.message);
            } else {
                 setSubmitError("Ocurrió un error desconocido al publicar el comunicado.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Lógica de Renderizado del Contenido (HU-08) ---
    let content;
    if (loading) {
        content = <p>Cargando comunicados...</p>;
    } else if (error) {
        content = <p className="text-red-500">{error}</p>;
    } else if (comunicados.length === 0) {
        content = <p className="text-gray-500 italic">No hay comunicados oficiales recientes.</p>
    } else {
        content = (
            <ul className="divide-y divide-gray-200">
                {comunicados.map((c) => (
                    <li key={c.id} className="py-4">
                        <h3 className="text-lg font-bold text-gray-900">{c.titulo}</h3>
                        <p className="text-gray-700 mt-1">{c.contenido}</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Publicado por **{c.autor.nombre}** el {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                    </li>
                ))}
            </ul>
        );
    }
    
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">📢 Muro de Comunicados Oficiales (HU-07, HU-08)</h1>

            {/* Formulario de Publicación */}
            {canPublish && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Publicar Nuevo Comunicado (HU-07)</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700" htmlFor="com-titulo">Título</label>
                            <input 
                                id="com-titulo"
                                type="text" 
                                value={newTitulo}
                                onChange={(e) => setNewTitulo(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700" htmlFor="com-contenido">Contenido</label>
                            <textarea
                                id="com-contenido"
                                value={newContenido}
                                onChange={(e) => setNewContenido(e.target.value)}
                                rows={4}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>
                        {submitError && <p className="text-red-500 text-sm">{submitError}</p>}
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Publicando...' : 'Publicar'}
                        </Button>
                    </form>
                </Card>
            )}

            {/* Lista de Comunicados (HU-08) */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Avisos Recientes</h2>
                {content}
            </Card>
        </div>
    );
}