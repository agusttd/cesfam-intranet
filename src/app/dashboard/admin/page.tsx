'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken } from '@/lib/auth';
import { API_URL, Role } from '@/lib/constants';
import { Usuario } from '@/lib/types'; 
import { useRouter } from 'next/navigation';

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

// Definición de roles para el formulario
const ROLES_OPTIONS = Object.values(Role).map(rol => ({ value: rol, label: rol }));


export default function UserAdminPage() {
    const router = useRouter();
    // Declaración de todos los Hooks al principio
    const [userRol, setUserRol] = useState<Role | null>(null);
    const [canAdmin, setCanAdmin] = useState(false);
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados del formulario de creación
    const [formData, setFormData] = useState({
        nombre: '', correo: '', password: '', rol: Role.FUNCIONARIO, rut: '', cargo: '', telefono: '',
    });
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    // --- Lógica de Carga de Usuarios ---
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/usuarios`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });
            if (!response.ok) throw new Error('Error al cargar la lista de usuarios');
            const data: Usuario[] = await response.json();
            setUsers(data);
            setError('');
        } catch (e) {
            console.error("Error al obtener usuarios:", e);
            setError('Error al conectar con la API de usuarios.');
        } finally {
            setLoading(false);
        }
    };


    // --- HOOK PRINCIPAL: Autenticación, Acceso y Carga de Datos (Estructura Corregida) ---
    useEffect(() => {
        const rol = getRol();
        setUserRol(rol);
        // Roles permitidos para esta página: ADMIN y DIRECCION
        const isAdmin = [Role.ADMIN, Role.DIRECCION].includes(rol as Role);
        setCanAdmin(isAdmin);

        // 1. Redirección si no tiene permisos (Lógica dentro del Hook)
        if (!isAdmin && rol !== null) { // rol !== null asegura que ya verificó el token
             // Ya que el layout verifica la sesión, esta redirección interna solo es por roles.
             router.replace('/dashboard'); 
        } else if (isAdmin) {
            // 2. Carga de datos si SÍ tiene permisos
            fetchUsers();
        }
    }, [router]);
    
    // Si la sesión está siendo verificada, muestra un estado de carga
    if (userRol === null && typeof window !== 'undefined') {
        return (
            <div className="text-gray-600 text-center mt-10">
                Verificando permisos...
            </div>
        );
    }
    
    // Si ya verificamos y NO es administrador, el router.replace ya se encarga.
    if (!canAdmin) return null;


    // --- Manejo de Formularios ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!formData.nombre || !formData.correo || !formData.password || !formData.rol || !formData.rut) {
            setFormError('Rellena todos los campos obligatorios (nombre, correo, contraseña, rol, rut).');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al crear el usuario.');
            }

            alert('✅ Usuario creado con éxito.');
            setFormData({ nombre: '', correo: '', password: '', rol: Role.FUNCIONARIO, rut: '', cargo: '', telefono: '' });
            fetchUsers();
        } catch (error) {
             if (error instanceof Error) {
                setFormError(error.message);
            } else {
                 setFormError("Error desconocido al crear usuario.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Manejo de Eliminación ---
    const handleDelete = async (userId: number, userName: string) => {
        if (!confirm(`¿Está seguro de eliminar al usuario ${userName}? Esta acción es irreversible.`)) return;

        try {
            const response = await fetch(`${API_URL}/usuarios/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar el usuario.');
            }

            alert(`✅ Usuario ${userName} eliminado.`);
            fetchUsers();
        } catch (error) {
            if (error instanceof Error) {
                alert(error.message);
            } else {
                alert("Error desconocido al eliminar usuario.");
            }
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">⚙️ Administración de Usuarios (CRUD)</h1>
            <p className="text-gray-600">
                Gestión de funcionarios, roles y datos de contacto.
            </p>

            {/* Formulario de Creación */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Crear Nuevo Usuario</h2>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Fila 1 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="nombre">Nombre</label>
                        <input id="nombre" type="text" value={formData.nombre} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="correo">Correo</label>
                        <input id="correo" type="email" value={formData.correo} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="rut">RUT</label>
                        <input id="rut" type="text" value={formData.rut} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    
                    {/* Fila 2 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="password">Contraseña</label>
                        <input id="password" type="password" value={formData.password} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="rol">Rol</label>
                        <select id="rol" value={formData.rol} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                            {ROLES_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700" htmlFor="cargo">Cargo</label>
                        <input id="cargo" type="text" value={formData.cargo} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>

                    {/* Fila 3 - Botón */}
                    <div className="md:col-span-3 pt-2">
                        {formError && <p className="text-red-500 text-sm mb-2">{formError}</p>}
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? 'Guardando...' : 'Registrar Nuevo Funcionario'}
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Listado de Usuarios */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Listado de Funcionarios</h2>
                
                {loading ? (
                    <p>Cargando usuarios...</p>
                ) : error ? (
                    <p className="text-red-500">{error}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo / RUT</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol / Cargo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.nombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {user.correo}<br/>
                                            <span className="text-xs text-gray-400">RUT: {user.rut}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                user.rol === Role.DIRECCION || user.rol === Role.ADMIN ? 'bg-red-100 text-red-800' :
                                                user.rol === Role.JEFE ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {user.rol}
                                            </span><br/>
                                            <span className="text-xs text-gray-500">{user.cargo}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => alert(`Abrir edición de ID: ${user.id}`)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                                Editar
                                            </button>
                                            <button onClick={() => handleDelete(user.id, user.nombre)} className="text-red-600 hover:text-red-900">
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}