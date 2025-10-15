import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// Función auxiliar para obtener el usuario desde el token (copia del archivo de Solicitudes/Login)
async function getUserFromToken(req: Request) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;
    const token = auth.split(" ")[1];
    try {
        // Asegúrate de que JWT_SECRET esté disponible en tu .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET!); 
        return decoded as { id: number; rol: string };
    } catch {
        return null;
    }
}

// POST: Crear nuevo Evento/Feriado (Roles: ADMIN, DIRECCION, SUBDIRECCION)
export async function POST(req: Request) {
    try {
        const user = await getUserFromToken(req);
        // Verificar que el usuario tenga un rol autorizado para crear eventos
        if (!user || !['ADMIN', 'DIRECCION', 'SUBDIRECCION'].includes(user.rol)) {
            return NextResponse.json({ error: "No autorizado para crear eventos" }, { status: 403 });
        }

        const body = await req.json();
        const { titulo, descripcion, fechaInicio, fechaFin, esFeriado } = body;

        if (!titulo || !fechaInicio) {
            return NextResponse.json({ error: "Faltan datos obligatorios (titulo, fechaInicio)" }, { status: 400 });
        }

        const nuevoEvento = await prisma.evento.create({
            data: {
                titulo,
                descripcion: descripcion || null,
                // Las fechas deben ser convertidas a objetos Date para la base de datos
                fechaInicio: new Date(fechaInicio),
                fechaFin: fechaFin ? new Date(fechaFin) : null,
                esFeriado: esFeriado ?? false,
            },
        });

        return NextResponse.json(nuevoEvento, { status: 201 });
    } catch (error) {
        console.error("Error creando evento:", error);
        return NextResponse.json({ error: "Error interno al crear evento" }, { status: 500 });
    }
}

// GET: Listar todos los Eventos (Accesible para Todos)
export async function GET(req: Request) {
    try {
        const user = await getUserFromToken(req);
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Listar todos los eventos ordenados por la fecha de inicio más cercana
        const eventos = await prisma.evento.findMany({
            orderBy: {
                fechaInicio: 'asc',
            },
        });

        return NextResponse.json(eventos);
    } catch (error) {
        console.error("Error obteniendo eventos:", error);
        return NextResponse.json({ error: "Error interno al obtener eventos" }, { status: 500 });
    }
}