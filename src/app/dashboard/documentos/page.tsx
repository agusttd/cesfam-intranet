'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken } from '@/lib/auth'; 
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

// Tipado del Documento
interface Documento {
    id: number;
    titulo: string;
    descripcion: string | null;
    url: string;
    creador: { nombre: string }; // Asumiendo que la API incluye el nombre del creador
    createdAt: string;
}

export default function DocumentosPage() {
    const userRol = getRol() as Role;
    // Roles con permiso para subir documentos (HU-02): ADMIN, SUBDIRECCION, DIRECCION
    const canUpload = [Role.ADMIN, Role.SUBDIRECCION, Role.DIRECCION].includes(userRol);
    
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Estados para el formulario de subida (HU-02)
    const [newTitulo, setNewTitulo] = useState('');
    const [newDescripcion, setNewDescripcion] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const fetchDocumentos = async () => {
        setLoading(true);
        try {
            // Llama a la ruta GET /api/documentos
            const response = await fetch(`${API_URL}/documentos`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });
            if (!response.ok) throw new Error('Error al cargar documentos');
            const data: Documento[] = await response.json();
            setDocumentos(data);
        } catch (e) {
            console.error("Error al obtener documentos:", e); 
            setError('Error al obtener el repositorio de documentos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocumentos();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (!newTitulo || !file) {
            setSubmitError('El título y el archivo son obligatorios.');
            return;
        }

        setIsSubmitting(true);
        
        // --- NOTA DE IMPLEMENTACIÓN DE ARCHIVOS ---
        // En un proyecto real, el archivo se subiría primero a Supabase Storage aquí.
        // Simularemos la obtención de la URL para el registro en la API.
        
        try {
            // SIMULACIÓN: Obtener URL de archivo
            const finalUrl = `https://supabase.storage.url/${file.name}-${Date.now()}`; 

            // 2. Registro en la API (POST /api/documentos)
            const response = await fetch(`${API_URL}/documentos`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}` 
                },
                body: JSON.stringify({ 
                    titulo: newTitulo, 
                    descripcion: newDescripcion, 
                    url: finalUrl,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al subir el documento');
            }

            // Éxito
            setNewTitulo('');
            setNewDescripcion('');
            setFile(null);
            fetchDocumentos(); 
            alert('Documento subido con éxito.');

        } catch (error) {
            if (error instanceof Error) {
                setSubmitError(error.message);
            } else {
                 setSubmitError("Ocurrió un error desconocido al subir el documento.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">📚 Repositorio de Documentos Internos (HU-01)</h1>

            {/* Formulario de Subida (HU-02) */}
            {canUpload && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Subir Documentos (HU-02)</h2>
                    <form onSubmit={handleUpload} className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="doc-titulo">Título</label>
                            <input 
                                id="doc-titulo"
                                type="text" 
                                value={newTitulo}
                                onChange={(e) => setNewTitulo(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="doc-file">Archivo</label>
                            <input 
                                id="doc-file"
                                type="file" 
                                onChange={handleFileChange}
                                required
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700" htmlFor="doc-descripcion">Descripción (Opcional)</label>
                            <textarea
                                id="doc-descripcion"
                                value={newDescripcion}
                                onChange={(e) => setNewDescripcion(e.target.value)}
                                rows={2}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                            />
                        </div>
                        <div className="col-span-2">
                            {submitError && <p className="text-red-500 text-sm mb-2">{submitError}</p>}
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Subiendo...' : 'Subir Documento'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Listado de Documentos (HU-01) */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Documentos Disponibles</h2>
                
                {loading ? (
                    <p>Cargando documentos...</p>
                ) : error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {documentos.map((doc) => (
                            <li key={doc.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">{doc.titulo}</h3>
                                    <p className="text-sm text-gray-600">{doc.descripcion || 'Sin descripción.'}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Publicado por {doc.creador.nombre} el {new Date(doc.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <a 
                                    href={doc.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-700 font-medium text-sm flex items-center"
                                >
                                    Descargar ↓
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}