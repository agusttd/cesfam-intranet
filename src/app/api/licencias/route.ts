import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// Función para verificar token y devolver usuario (Reutilizada de otros módulos)
async function getUserFromToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    // El 'rol' en el token debe coincidir con los ENUMs de Prisma
    return decoded as { id: number; rol: string }; 
  } catch {
    return null;
  }
}

// POST: Registrar nueva licencia (solo Subdirección)
export async function POST(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // 1. Verificar si el usuario tiene permiso para registrar licencias (Subdirección)
    if (user.rol !== "SUBDIRECCION") {
      return NextResponse.json({ error: "Acceso denegado. Solo Subdirección puede registrar licencias." }, { status: 403 });
    }

    const body = await req.json();
    const { rut, fechaInicio, fechaFin, archivoUrl, observacion } = body;

    if (!rut || !fechaInicio || !fechaFin) {
      return NextResponse.json({ error: "Faltan datos obligatorios (RUT, fecha inicio y fin)." }, { status: 400 });
    }

    // 2. Buscar al funcionario por RUT
    const funcionario = await prisma.usuario.findUnique({
      where: { rut: rut },
      select: { id: true },
    });

    if (!funcionario) {
      return NextResponse.json({ error: "No se encontró un funcionario con ese RUT." }, { status: 404 });
    }

    // 3. Crear el registro de la Licencia
    const nuevaLicencia = await prisma.licencia.create({
      data: {
        funcionarioId: funcionario.id,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        archivoUrl: archivoUrl, // URL del archivo subido a Supabase Storage
        observacion: observacion,
        estado: "REGISTRADA", // Estado inicial
      },
    });

    return NextResponse.json(nuevaLicencia, { status: 201 });
  } catch (error) {
    console.error("Error registrando licencia:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// GET: Listar licencias (para reportes, solo Subdirección)
export async function GET(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // 1. Verificar si el usuario tiene permiso para listar licencias
    if (user.rol !== "SUBDIRECCION" && user.rol !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    // 2. Obtener todas las licencias registradas para el reporte
    const licencias = await prisma.licencia.findMany({
      include: {
        funcionario: {
          select: { nombre: true, rut: true, cargo: true },
        },
      },
      orderBy: { creadoEn: "desc" },
    });

    return NextResponse.json(licencias);
  } catch (error) {
    console.error("Error obteniendo licencias:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}