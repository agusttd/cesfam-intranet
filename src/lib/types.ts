import { Role } from './constants';

export interface Usuario {
    id: number;
    nombre: string;
    correo: string;
    rol: Role;
    rut: string;        
    telefono?: string;  
    cargo?: string;
}

// Basado en SolicitudEstado y SolicitudTipo de schema.prisma
export type SolicitudEstado = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO';
export type SolicitudTipo = 'VACACIONES' | 'ADMINISTRATIVO';

export interface Solicitud {
    id: number;
    tipo: SolicitudTipo;
    motivo: string | null;
    fechaInicio: string; // Usaremos string ISO para la API
    fechaFin: string; // Usaremos string ISO para la API
    solicitanteId: number;
    solicitante: { nombre: string; correo: string; rol: Role };
    estado: SolicitudEstado;
    
    jefeAprobadorId: number | null;
    jefeAprobador: { nombre: string } | null;
    jefeAprobadoAt: string | null;

    direccionAprobadorId: number | null;
    direccionAprobador: { nombre: string } | null;
    direccionAprobadoAt: string | null;

    pdfUrl: string | null

    creadoEn: string;
}

export interface Evento {
    id: number;
    titulo: string;
    descripcion: string | null;
    fechaInicio: string; // Se usará string ISO
    fechaFin: string | null;
    esFeriado: boolean;
    creadoEn: string;
}