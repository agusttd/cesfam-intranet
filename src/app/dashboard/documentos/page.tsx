'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken } from '@/lib/auth'; 
import { API_URL, Role } from '@/lib/constants';
// Importamos el cliente de Supabase para subir archivos
import { supabase } from '@/lib/supabaseClient';

// --- Componentes Reutilizables ---
interface CardProps { children: React.ReactNode; className?: string }
const Card = ({ children, className = '' }: CardProps) => <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>{children}</div>;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { children: React.ReactNode; }
const Button = ({ children, className = '', ...props }: ButtonProps) => (
    <button 
        {...props}
        className={`px-4 py-2 rounded text-white font-semibold transition ${props.disabled ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} ${className}`}
    >
        {children}
    </button>
);

interface Documento {
    id: number;
    titulo: string;
    descripcion: string | null;
    url: string;
    creador: { nombre: string };
    createdAt: string;
}

export default function DocumentosPage() {
    const userRol = getRol() as Role;
    const canUpload = [Role.ADMIN, Role.SUBDIRECCION, Role.DIRECCION].includes(userRol);
    
    const [documentos, setDocumentos] = useState<Documento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados Formulario
    const [newTitulo, setNewTitulo] = useState('');
    const [newDescripcion, setNewDescripcion] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const fetchDocumentos = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/documentos`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });
            if (!response.ok) throw new Error('Error al cargar documentos');
            setDocumentos(await response.json());
        } catch (e) {
            console.error(e); 
            setError('Error al obtener el repositorio.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocumentos();
    }, []);

    const filteredDocumentos = documentos.filter(doc => 
        doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.descripcion && doc.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
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
        try {
            // 1. Subir archivo a Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`; // Nombre único
            const filePath = `${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('documentos') // Nombre del Bucket que creaste
                .upload(filePath, file);

            if (uploadError) {
                throw new Error(`Error subiendo archivo: ${uploadError.message}`);
            }

            // 2. Obtener la URL pública
            const { data: urlData } = supabase.storage
                .from('documentos')
                .getPublicUrl(filePath);

            const finalUrl = urlData.publicUrl;

            // 3. Guardar registro en la Base de Datos (vía API)
            const response = await fetch(`${API_URL}/documentos`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}` 
                },
                body: JSON.stringify({ 
                    titulo: newTitulo, 
                    descripcion: newDescripcion, 
                    url: finalUrl, // Guardamos la URL real de Supabase
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Error al guardar en base de datos');
            }

            // Éxito: Limpiar y recargar
            setNewTitulo('');
            setNewDescripcion('');
            setFile(null);
            // Limpiar el input file visualmente
            const fileInput = document.getElementById('doc-file') as HTMLInputElement;
            if(fileInput) fileInput.value = '';
            
            alert('Documento subido exitosamente.');
            fetchDocumentos(); 

        } catch (error: any) {
            console.error(error);
            setSubmitError(error.message || "Error desconocido al subir.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">📚 Repositorio de Documentos</h1>
            </div>

            {/* Buscador */}
            <Card>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="🔍 Buscar documentos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pl-10 text-gray-900"
                    />
                </div>
            </Card>

            {/* Formulario de Subida */}
            {canUpload && (
                <Card className="border-t-4 border-blue-500">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Subir Nuevo Documento</h2>
                    <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                            <input type="text" value={newTitulo} onChange={(e) => setNewTitulo(e.target.value)} required className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Archivo</label>
                            <input 
                                id="doc-file"
                                type="file" 
                                onChange={handleFileChange} 
                                required 
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <input type="text" value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} className="w-full p-2 border rounded-md" />
                        </div>
                        <div className="md:col-span-2 pt-2">
                            {submitError && <p className="text-red-500 text-sm mb-2 bg-red-50 p-2 rounded">{submitError}</p>}
                            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                                {isSubmitting ? 'Subiendo...' : 'Subir Documento'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Listado */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">
                    Documentos Disponibles ({filteredDocumentos.length})
                </h2>
                {loading ? <p className="text-gray-500 text-center py-4">Cargando...</p> : error ? <p className="text-red-500 text-center">{error}</p> : (
                    <ul className="divide-y divide-gray-100">
                        {filteredDocumentos.length === 0 ? (
                            <p className="text-gray-500 italic py-8 text-center">No se encontraron documentos.</p>
                        ) : (
                            filteredDocumentos.map((doc) => (
                                <li key={doc.id} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 p-3 rounded-lg transition">
                                    <div className="mb-2 sm:mb-0">
                                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                            📄 {doc.titulo}
                                        </h3>
                                        {doc.descripcion && <p className="text-sm text-gray-600 ml-6">{doc.descripcion}</p>}
                                        <p className="text-xs text-gray-400 mt-1 ml-6">
                                            Subido por {doc.creador?.nombre || 'Admin'} • {new Date(doc.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <a 
                                        href={doc.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg font-medium text-sm border border-blue-200 flex items-center gap-2 transition"
                                    >
                                        ⬇ Descargar
                                    </a>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </Card>
        </div>
    );
}