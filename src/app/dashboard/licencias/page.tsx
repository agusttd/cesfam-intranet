'use client';

import React, { useState } from 'react';
import { getRol, getToken, } from '@/lib/auth';
import { useRouter } from 'next/navigation';
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


export default function LicenciasPage() {
    const userRol = getRol() as Role;
    const router = useRouter();
    // Solo el rol SUBDIRECCION puede gestionar licencias
    const canManage = userRol === Role.SUBDIRECCION;
    
    // Estados del formulario
    const [funcionarioRut, setFuncionarioRut] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [observacion, setObservacion] = useState('');
    const [file, setFile] = useState<File | null>(null); // Para el archivo de licencia (foto/PDF)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');


    // Protección de ruta a nivel de componente si el Layout falla.
    if (typeof window !== 'undefined' && !canManage) {
        // En lugar de un simple push, usa replace para no guardar la ruta en el historial
        router.replace('/dashboard');
        // No renderizar si no tiene permisos
        return (
            <div className="text-red-500 font-semibold text-center mt-10">
                Acceso denegado. Esta función es solo para Subdirección.
            </div>
        );
    }


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        
        if (!funcionarioRut || !fechaInicio || !fechaFin || !file) {
            setSubmitError('Debe completar todos los campos y subir el archivo de licencia.');
            return;
        }

        setIsSubmitting(true);
        
        try {
            // NOTA: Implementación de subida a Supabase Storage omitida. 
            // SIMULACIÓN: Obtener URL de archivo
            const archivoUrl = `https://supabase.storage.url/${file.name}_${Date.now()}`; 

            // 2. Registro en la API (ruta POST a /api/licencias)
            const response = await fetch(`${API_URL}/licencias`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}` 
                },
                body: JSON.stringify({
                    rut: funcionarioRut, // El backend debe buscar el funcionarioId usando este RUT
                    fechaInicio,
                    fechaFin,
                    archivoUrl,
                    observacion,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al registrar la licencia');
            }

            alert('✅ Licencia registrada con éxito.');
            // Limpiar formulario
            setFuncionarioRut('');
            setFechaInicio('');
            setFechaFin('');
            setObservacion('');
            setFile(null);

        } catch (error) {
            if (error instanceof Error) {
                setSubmitError(error.message);
            } else {
                 setSubmitError("Ocurrió un error desconocido al enviar el registro.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">📋 Gestión de Licencias Médicas</h1>
            <p className="text-gray-600">
                Funcionalidad exclusiva para la Subdirección. Registrar licencias y ver reportes.
            </p>

            {/* Formulario de Registro */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Registrar Nueva Licencia</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="licencia-rut">RUT del Funcionario</label>
                        <input 
                            id="licencia-rut"
                            type="text" 
                            placeholder="Ej: 12345678-9"
                            value={funcionarioRut}
                            onChange={(e) => setFuncionarioRut(e.target.value)}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="licencia-file">Archivo de Licencia (PDF/Imagen)</label>
                        <input 
                            id="licencia-file"
                            type="file" 
                            onChange={handleFileChange}
                            required
                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="licencia-inicio">Fecha de Inicio</label>
                        <input 
                            id="licencia-inicio"
                            type="date" 
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="licencia-fin">Fecha de Fin</label>
                        <input 
                            id="licencia-fin"
                            type="date" 
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="licencia-obs">Observación</label>
                        <textarea
                            id="licencia-obs"
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                        />
                    </div>
                    <div className="col-span-2">
                        {submitError && <p className="text-red-500 text-sm mb-2">{submitError}</p>}
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Registrando...' : 'Registrar Licencia'}
                        </Button>
                    </div>
                </form>
            </Card>
            
            {/* Reportes de Licencias */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Reporte de Licencias Registradas</h2>
                <p className="text-gray-500">Aquí se mostraría la tabla y la opción para generar reportes por funcionario.</p>
            </Card>
        </div>
    );
}