import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { accion } = await req.json(); // "aprobar" o "rechazar"
    const solicitudId = parseInt(params.id);

    const solicitud = await prisma.solicitud.findUnique({ where: { id: solicitudId } });
    if (!solicitud) return NextResponse.json({ error: "No existe la solicitud" }, { status: 404 });

    let updateData: Prisma.SolicitudUpdateInput = {};
    const ahora = new Date();

    if (user.rol === "JEFE") {
      updateData = {
        estado: accion === "aprobar" ? "PENDIENTE" : "RECHAZADO",
        jefeAprobador: { connect: { id: user.id } },
        jefeAprobadoAt: ahora,
      };
    } else if (user.rol === "DIRECCION") {
      updateData = {
        estado: accion === "aprobar" ? "APROBADO" : "RECHAZADO",
        direccionAprobador: { connect: { id: user.id } },
        direccionAprobadoAt: ahora,
      };
    } else {
      return NextResponse.json({ error: "No autorizado para aprobar" }, { status: 403 });
    }

    const actualizada = await prisma.solicitud.update({
      where: { id: solicitudId },
      data: updateData,
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error("Error aprobando solicitud:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
