'use client';

import React, { useState, useEffect } from 'react';
import { getRol, getToken } from '@/lib/auth';
import { API_URL, Role } from '@/lib/constants';
import { Usuario } from '@/lib/types'; 
import { useRouter } from 'next/navigation';

// Extendemos la interfaz Usuario para incluir los días (si no están en types.ts aún)
interface UsuarioAdmin extends Usuario {
    diasVacaciones?: number;
    diasAdministrativos?: number;
}

// Componentes reutilizables
interface CardProps { children: React.ReactNode; className?: string }
const Card = ({ children, className = '' }: CardProps) => <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>{children}</div>;

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

const ROLES_OPTIONS = Object.values(Role).map(rol => ({ value: rol, label: rol }));

export default function UserAdminPage() {
    const router = useRouter();
    const [userRol, setUserRol] = useState<Role | null>(null);
    const [canAdmin, setCanAdmin] = useState(false);
    const [users, setUsers] = useState<UsuarioAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estado para el usuario que se está editando (null = modo creación)
    const [editingUser, setEditingUser] = useState<UsuarioAdmin | null>(null);

    // Formulario
    const [formData, setFormData] = useState({
        nombre: '', correo: '', password: '', rol: Role.FUNCIONARIO, rut: '', cargo: '', telefono: '',
        diasVacaciones: 15, diasAdministrativos: 6
    });
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/usuarios`, {
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });
            if (!response.ok) throw new Error('Error al cargar usuarios');
            const data: UsuarioAdmin[] = await response.json();
            setUsers(data);
            setError('');
        } catch (e) {
            console.error(e);
            setError('Error de conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const rol = getRol();
        setUserRol(rol);
        const isAdmin = [Role.ADMIN, Role.DIRECCION, Role.SUBDIRECCION].includes(rol as Role); // Subdirección también puede ver
        setCanAdmin(isAdmin);

        if (!isAdmin && rol !== null) {
             router.replace('/dashboard'); 
        } else if (isAdmin) {
            fetchUsers();
        }
    }, [router]);
    
    if (userRol === null) return <div className="p-8 text-center">Verificando...</div>;
    if (!canAdmin) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    // Cargar datos en el formulario para editar
    const handleEditClick = (user: UsuarioAdmin) => {
        setEditingUser(user);
        setFormData({
            nombre: user.nombre,
            correo: user.correo,
            password: '', // No mostramos la contraseña
            rol: user.rol,
            rut: user.rut,
            cargo: user.cargo || '',
            telefono: user.telefono || '',
            diasVacaciones: user.diasVacaciones ?? 15,
            diasAdministrativos: user.diasAdministrativos ?? 6
        });
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir al formulario
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setFormData({ nombre: '', correo: '', password: '', rol: Role.FUNCIONARIO, rut: '', cargo: '', telefono: '', diasVacaciones: 15, diasAdministrativos: 6 });
        setFormError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);

        try {
            const url = editingUser 
                ? `${API_URL}/usuarios/${editingUser.id}` 
                : `${API_URL}/usuarios`;
            
            const method = editingUser ? 'PUT' : 'POST';

            // Si editamos y no se puso password, la quitamos del body para no enviarla vacía
            const bodyData: any = { ...formData };
            if (editingUser && !bodyData.password) {
                delete bodyData.password;
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(bodyData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error en la operación.');
            }

            alert(`Usuario ${editingUser ? 'actualizado' : 'creado'} con éxito.`);
            handleCancelEdit(); // Limpiar y salir de edición
            fetchUsers(); // Recargar lista
        } catch (error: any) {
             setFormError(error.message || "Error desconocido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (userId: number, userName: string) => {
        if (!confirm(`¿Desactivar al usuario ${userName}?`)) return;
        try {
            const response = await fetch(`${API_URL}/usuarios/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` },
            });
            if (!response.ok) throw new Error('Error al eliminar.');
            alert(`Usuario desactivado.`);
            fetchUsers();
        } catch (error: any) {
            alert(error.message);
        }
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">⚙️ Administración de Usuarios</h1>
            <p className="text-gray-600">Gestión de funcionarios, roles y saldos de días.</p>

            {/* Formulario de Creación / Edición */}
            <Card className={editingUser ? "border-2 border-blue-400" : ""}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">
                        {editingUser ? `Editar Usuario: ${editingUser.nombre}` : 'Registrar Nuevo Usuario'}
                    </h2>
                    {editingUser && (
                        <button onClick={handleCancelEdit} className="text-sm text-red-500 hover:underline">
                            Cancelar Edición
                        </button>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Datos Personales */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre</label>
                        <input id="nombre" type="text" value={formData.nombre} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">RUT</label>
                        <input id="rut" type="text" value={formData.rut} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Correo</label>
                        <input id="correo" type="email" value={formData.correo} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    
                    {/* Rol y Cargo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Rol</label>
                        <select id="rol" value={formData.rol} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                            {ROLES_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cargo</label>
                        <input id="cargo" type="text" value={formData.cargo} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña {editingUser && '(Dejar en blanco para no cambiar)'}</label>
                        <input id="password" type="password" value={formData.password} onChange={handleInputChange} required={!editingUser} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>

                    {/* Gestión de Días (NUEVO) */}
                    <div className="md:col-span-3 border-t pt-4 mt-2">
                        <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase">Saldo de Días Disponibles</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-green-700">Días Vacaciones</label>
                                <input id="diasVacaciones" type="number" value={formData.diasVacaciones} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-green-300 shadow-sm p-2 border bg-green-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-700">Días Administrativos</label>
                                <input id="diasAdministrativos" type="number" value={formData.diasAdministrativos} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-blue-300 shadow-sm p-2 border bg-blue-50" />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-3 pt-4">
                        {formError && <p className="text-red-500 text-sm mb-2">{formError}</p>}
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? 'Guardando...' : (editingUser ? 'Guardar Cambios' : 'Crear Usuario')}
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Listado */}
            <Card>
                <h2 className="text-xl font-semibold mb-4 text-gray-700">Listado de Funcionarios</h2>
                {loading ? <p>Cargando...</p> : error ? <p className="text-red-500">{error}</p> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saldo Días</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className={editingUser?.id === user.id ? "bg-blue-50" : ""}>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900">{user.nombre}</p>
                                            <p className="text-xs text-gray-500">{user.cargo} - {user.rol}</p>
                                            <p className="text-xs text-gray-400">{user.rut}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                                                Vac: {user.diasVacaciones ?? 0}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Adm: {user.diasAdministrativos ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium">
                                            <button onClick={() => handleEditClick(user)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                                Editar
                                            </button>
                                            <button onClick={() => handleDelete(user.id, user.nombre)} className="text-red-600 hover:text-red-900">
                                                Desactivar
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