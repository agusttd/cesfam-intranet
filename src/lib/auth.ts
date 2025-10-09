import { Role } from './constants';

const TOKEN_KEY = 'cesfam_jwt';
const ROL_KEY = 'cesfam_rol';

/**
 * Guarda el token y el rol del usuario en localStorage tras el login.
 */
export const saveAuthData = (token: string, rol: Role): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROL_KEY, rol);
};

/**
 * Obtiene el token de autenticación.
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Obtiene el rol del usuario autenticado.
 */
export const getRol = (): Role | null => {
  if (typeof window === 'undefined') return null;
  const rol = localStorage.getItem(ROL_KEY);
  return rol as Role | null;
};

/**
 * Cierra la sesión y limpia el almacenamiento.
 */
export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROL_KEY);
  // Forzar una recarga de página para aplicar la nueva sesión
  window.location.href = '/'; 
};

/**
 * Verifica si el usuario actual tiene el rol requerido para una ruta.
 */
export const hasRequiredRole = (requiredRoles: Role[]): boolean => {
  const userRol = getRol();
  if (!userRol) return false;
  return requiredRoles.includes(userRol);
};

export function clearAuthData(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('rol');
    }
}