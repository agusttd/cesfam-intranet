"use client"; 

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role, API_URL } from "@/lib/constants";
import { getRol, getToken } from "@/lib/auth"; // localStorage
import {
  SolicitudCard,
  ComunicadoCard,
  EventoCard,
} from "@/components/DashboardCards";

// --- Interfaces de Datos ---
interface UsuarioDashboard {
  id: number;
  rol: string;
  nombre: string;
}
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
  createdAt: string;
  autor: { nombre: string };
}
interface EventoData {
  id: number;
  titulo: string;
  fechaInicio: string;
  esFeriado: boolean;
}

// --- COMPONENTE CLIENTE PRINCIPAL ---
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UsuarioDashboard | null>(null);
  const [pendingSolicitudes, setPendingSolicitudes] = useState<SolicitudData[]>(
    []
  );
  const [latestComunicados, setLatestComunicados] = useState<ComunicadoData[]>(
    []
  );
  const [upcomingEventos, setUpcomingEventos] = useState<EventoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = getToken(); // Lee de localStorage
      const rol = getRol(); // Lee de localStorage

      if (!token || !rol) {
        router.replace("/");
        return;
      }

      // Placeholder para el nombre del usuario
      setUser({ id: 0, rol: rol, nombre: `Usuario (${rol})` });

      try {
        const [solicitudesRes, comunicadosRes, eventosRes] = await Promise.all([
          fetch(`${API_URL}/solicitudes?status=pending&limit=5`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/comunicados?limit=3`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/eventos?upcoming=true&limit=4`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // Verificamos 'ok' y si falla, solo logueamos el status
        if (solicitudesRes.ok) {
          setPendingSolicitudes(await solicitudesRes.json());
        } else {
          console.error(
            `Error cargando solicitudes: ${solicitudesRes.status} ${solicitudesRes.statusText}`
          );
        }

        if (comunicadosRes.ok) {
          setLatestComunicados(await comunicadosRes.json());
        } else {
          console.error(
            `Error cargando comunicados: ${comunicadosRes.status} ${comunicadosRes.statusText}`
          );
        }

        if (eventosRes.ok) {
          setUpcomingEventos(await eventosRes.json());
        } else {
          console.error(
            `Error cargando eventos: ${eventosRes.status} ${eventosRes.statusText}`
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Error en fetch principal:", err.message);
        } else {
          console.error("Error en fetch principal:", String(err));
        }
        setError("No se pudieron cargar los datos del dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // --- Renderizado Condicional ---
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600">Cargando dashboard...</div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-gray-600">Verificando sesión...</div>
    );
  }

  // --- Renderizado del Dashboard ---

  interface CardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
  }
  const Card = ({ children, className = "", style }: Readonly<CardProps>) => (
    <div
      className={`bg-white p-5 rounded-lg shadow-md ${className}`}
      style={style}
    >
      {children}
    </div>
  );

  const userRol = user.rol as Role;

  const getPendingTasks = () => {
    const isApprover = [
      Role.JEFE,
      Role.DIRECCION,
      Role.SUBDIRECCION,
      Role.ADMIN,
    ].includes(userRol);
    const count = pendingSolicitudes.length;

    if (isApprover) {
      const baseHref = "/dashboard/solicitudes";
      let label =
        count > 0
          ? `Revisar ${count} Tarea(s) Pendiente(s)`
          : "Revisar Solicitudes";
      let color = count > 0 ? "red" : "green";

      if (userRol === Role.SUBDIRECCION) {
        label =
          count > 0
            ? `Revisar Solicitudes (${count}) y Licencias`
            : "Gestionar Licencias y Avisos";
        color = "purple";
      } else if (userRol === Role.JEFE) {
        label =
          count > 0
            ? `Revisar ${count} Tarea(s) (Equipo)`
            : "Solicitudes Equipo";
        color = count > 0 ? "yellow" : "green";
      } else if (userRol === Role.ADMIN || userRol === Role.DIRECCION) {
        label =
          count > 0
            ? `Revisar ${count} Solicitud(es)`
            : "Gestionar Solicitudes/Usuarios";
        color = count > 0 ? "orange" : "blue";
      }

      return { label, href: baseHref, colorClass: `border-${color}-500` };
    } else {
      // Funcionario
      const funcionarioLabel =
        count > 0
          ? `Ver mis ${count} Solicitud(es) Pendiente(s)`
          : "Ver mis Solicitudes";
      return {
        label: funcionarioLabel,
        href: "/dashboard/solicitudes",
        colorClass: "border-blue-500",
      };
    }
  };

  const pendingTasks = getPendingTasks();

  return (
    <div className="p-6 md:p-8 space-y-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
        Panel General 🏠
      </h1>
      <p className="text-gray-600">
        ¡Bienvenido, {user.nombre}! ({user.rol})
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* 1. WIDGET DE TAREAS POR ROL */}
        <Card className={`lg:col-span-1 border-l-4 ${pendingTasks.colorClass}`}>
          <h2 className="text-lg md:text-xl font-semibold mb-3 text-gray-700">
            Panel de Rol
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Acciones principales para tu rol:
          </p>
          <Link
            href={pendingTasks.href}
            className={`block p-3 rounded-md text-center font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow`}
          >
            {pendingTasks.label} →
          </Link>
        </Card>

        {/* 2. WIDGET DE COMUNICADOS */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg md:text-xl font-semibold mb-3 text-gray-700">
            📣 Comunicados Recientes
          </h2>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {latestComunicados.length === 0 ? (
              <p className="text-gray-500 italic text-sm">
                No hay comunicados recientes.
              </p>
            ) : (
              latestComunicados.map((c) => (
                <ComunicadoCard
                  key={c.id}
                  comunicado={{
                    id: c.id,
                    titulo: c.titulo,
                    contenido: c.contenido,
                    fechaPublicacion: c.createdAt,
                  }}
                />
              ))
            )}
          </div>
          <Link
            href="/dashboard/comunicados"
            className="mt-4 block text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Ver todos los comunicados →
          </Link>
        </Card>

        {/* 3. WIDGET DE CALENDARIO */}
        <Card className="lg:col-span-3">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-gray-700">
            📅 Próximos Eventos y Feriados
          </h2>
          {upcomingEventos.length === 0 ? (
            <p className="text-gray-500 italic text-sm">
              No hay eventos próximos registrados.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {upcomingEventos.map((e) => (
                <EventoCard
                  key={e.id}
                  evento={{
                    id: e.id,
                    titulo: e.titulo,
                    fecha: e.fechaInicio,
                  }}
                />
              ))}
            </div>
          )}
          <Link
            href="/dashboard/calendario"
            className="mt-4 block text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Ver Calendario Completo →
          </Link>
        </Card>
      </div>

      {/* ENLACES RÁPIDOS PARA ADMIN/DIRECCIÓN */}
      {(userRol === Role.ADMIN || userRol === Role.DIRECCION) && (
        <Card className="mt-8 bg-indigo-50 border border-indigo-200">
          <h2 className="text-lg md:text-xl font-semibold text-indigo-800 mb-4">
            Panel de Administración
          </h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard/admin"
              className="text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Gestionar Usuarios
            </Link>
            <Link
              href="/dashboard/licencias"
              className="text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Ver Reporte Licencias
            </Link>
            <Link
              href="/dashboard/calendario"
              className="text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Administrar Calendario
            </Link>
            <Link
              href="/dashboard/documentos"
              className="text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Administrar Documentos
            </Link>
            <Link
              href="/dashboard/comunicados"
              className="text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Administrar Comunicados
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
