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
    
    // Estado para el Buscador
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
            const data: Documento[] = await response.json();
            setDocumentos(data);
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

    // Filtramos los documentos según el término de búsqueda
    const filteredDocumentos = documentos.filter(doc => 
        doc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.descripcion && doc.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFile(e.target.files[0]);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (!newTitulo || !file) {
            setSubmitError('Título y archivo obligatorios.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Simulamos URL (aquí iría Supabase Storage)
            const finalUrl = `https://fake-storage.com/${file.name}`; 

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

            if (!response.ok) throw new Error('Error al subir');

            setNewTitulo('');
            setNewDescripcion('');
            setFile(null);
            fetchDocumentos(); 
            alert('Documento subido.');
        } catch (error) {
             setSubmitError("Error al subir.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">📚 Repositorio de Documentos</h1>
            </div>

            {/* Buscador */}
            <Card>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="🔍 Buscar por título o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pl-10"
                    />
                    <span className="absolute left-3 top-3.5 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                </div>
            </Card>

            {canUpload && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Subir Nuevo Documento</h2>
                    <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Título</label>
                            <input type="text" value={newTitulo} onChange={(e) => setNewTitulo(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Archivo</label>
                            <input type="file" onChange={handleFileChange} required className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Descripción</label>
                            <input type="text" value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                        <div className="md:col-span-2">
                            {submitError && <p className="text-red-500 text-sm mb-2">{submitError}</p>}
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Subiendo...' : 'Subir'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Listado ({filteredDocumentos.length})</h2>
                {loading ? <p>Cargando...</p> : error ? <p className="text-red-500">{error}</p> : (
                    <ul className="divide-y divide-gray-200">
                        {filteredDocumentos.length === 0 ? (
                            <p className="text-gray-500 italic py-4">No se encontraron documentos.</p>
                        ) : (
                            filteredDocumentos.map((doc) => (
                                <li key={doc.id} className="py-4 flex justify-between items-center hover:bg-gray-50 transition px-2 rounded">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900">{doc.titulo}</h3>
                                        <p className="text-sm text-gray-600">{doc.descripcion}</p>
                                        <p className="text-xs text-gray-400 mt-1">Por: {doc.creador.nombre} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <a href={doc.url} target="_blank" className="text-blue-600 hover:text-blue-800 font-medium text-sm bg-blue-50 px-3 py-1 rounded border border-blue-200">Descargar</a>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </Card>
        </div>
    );
}