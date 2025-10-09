'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuthData } from '@/lib/auth';
import { API_URL, Role } from '@/lib/constants';

// Componente simple de botón para este ejemplo
const Button = ({ children, ...props }: React.ComponentPropsWithoutRef<'button'>) => (
  <button 
    {...props} 
    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150"
  >
    {children}
  </button>
);

export default function LoginPage() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Credenciales inválidas');
        setLoading(false);
        return;
      }

      const { token, rol } = await response.json();
      
      // Guardar token y rol, y redirigir
      saveAuthData(token, rol as Role);
      router.push('/dashboard');
      
    } catch (err) {
    console.error(err);
    setError('Error de conexión con el servidor. Por favor, revisa la consola.');
    setLoading(false);
  }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Intranet CESFAM 🏥
        </h2>
        <p className="text-center text-gray-500">
          Inicia sesión para acceder
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="correo">
              Correo Electrónico
            </label>
            <input
              id="correo"
              type="email"
              placeholder="ejemplo@cesfam.cl"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="**********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-xs italic text-center">{error}</p>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </Button>
          </div>
        </form>
        <p className="text-center text-xs text-gray-500">
          CESFAM Santa Rosa © 2025
        </p>
      </div>
    </div>
  );
}