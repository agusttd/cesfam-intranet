import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma'; 
import jwt from "jsonwebtoken";


//Función para verificar token y devolver usuario
async function getUserFromToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    return decoded as { id: number; rol: string };
  } catch {
    return null;
  }
}

//POST: crear nueva solicitud
export async function POST(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { tipo, motivo, fechaInicio, fechaFin } = body;

    if (!tipo || !fechaInicio || !fechaFin)
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });

    const nueva = await prisma.solicitud.create({
      data: {
        tipo,
        motivo,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        solicitanteId: user.id,
      },
    });

    return NextResponse.json(nueva, { status: 201 });
  } catch (error) {
    console.error("Error creando solicitud:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

//GET: listar solicitudes (por rol)
export async function GET(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let where: Prisma.SolicitudWhereInput = {};

    switch (user.rol) {
      case "FUNCIONARIO":
        where = { solicitanteId: user.id };
        break;
      case "JEFE":
        where = { jefeAprobadorId: null };
        break;
      case "DIRECCION":
        where = {
          jefeAprobadorId: { not: null },
          direccionAprobadorId: null,
        };
        break;
      default:
        where = {};
    }

    const solicitudes = await prisma.solicitud.findMany({
      where,
      include: {
        solicitante: {
          select: { nombre: true, correo: true, rol: true },
        },
      },
      orderBy: { creadoEn: "desc" },
    });

    return NextResponse.json(solicitudes);
  } catch (error) {
    console.error("Error obteniendo solicitudes:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
