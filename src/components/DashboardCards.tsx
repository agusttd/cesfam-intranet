import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale'; // Para formato en español
import Link from 'next/link';

// --- Interfaces (Deberían estar en src/lib/types.ts, pero las definimos aquí por simplicidad) ---
interface SolicitudData {
    id: number;
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    solicitante: { nombre: string };
}

interface ComunicadoData {
    id: number;
    titulo: string;
    contenido: string;
    fechaPublicacion: string;
}

interface EventoData {
    id: number;
    titulo: string;
    fecha: string;
}

// --- Card para Solicitudes Pendientes ---
export function SolicitudCard({ solicitud }: { solicitud: SolicitudData }) {
    return (
        <Link 
            href={`/dashboard/solicitudes?id=${solicitud.id}`} 
            className="block p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg border border-yellow-200 transition duration-150"
        >
            <div className="flex justify-between items-center">
                <p className="font-semibold text-sm text-yellow-800">
                    {solicitud.solicitante.nombre}
                </p>
                <span className="text-xs font-medium text-red-600">
                    {solicitud.tipo === 'VACACIONES' ? 'Vacaciones' : 'Día Admin.'}
                </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
                {`Desde ${format(new Date(solicitud.fechaInicio), 'dd/MM', { locale: es })} hasta ${format(new Date(solicitud.fechaFin), 'dd/MM', { locale: es })}`}
            </p>
        </Link>
    );
}

// --- Card para Comunicados ---
export function ComunicadoCard({ comunicado }: { comunicado: ComunicadoData }) {
    const fecha = new Date(comunicado.fechaPublicacion);
    const fechaDisplay = isToday(fecha) ? 'Hoy' : format(fecha, 'dd MMM', { locale: es });

    return (
        <Link 
            href="/dashboard/comunicados" 
            className="block p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition duration-150"
        >
            <div className="flex justify-between items-start">
                <p className="font-semibold text-sm text-gray-800 line-clamp-2">
                    {comunicado.titulo}
                </p>
                <span className="text-xs font-medium text-blue-600 ml-2 flex-shrink-0">
                    {fechaDisplay}
                </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                {comunicado.contenido}
            </p>
        </Link>
    );
}

// --- Card para Eventos/Feriados ---
export function EventoCard({ evento }: { evento: EventoData }) {
    const fecha = new Date(evento.fecha);
    const fechaDisplay = format(fecha, 'eee dd MMM', { locale: es }); // Ej: Mar. 16 Oct

    return (
        <Link 
            href="/dashboard/calendario" 
            className="block p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition duration-150"
        >
            <div className="flex justify-between items-start">
                <p className="font-semibold text-sm text-gray-800 line-clamp-2">
                    {evento.titulo}
                </p>
                <span className={`text-xs font-bold ml-2 flex-shrink-0 ${isToday(fecha) ? 'text-red-600' : 'text-green-600'}`}>
                    {fechaDisplay}
                </span>
            </div>
        </Link>
    );
}