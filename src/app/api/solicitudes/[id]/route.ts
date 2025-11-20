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

    // Incluimos al solicitante para saber a quién descontarle los días
    const solicitud = await prisma.solicitud.findUnique({ 
        where: { id: solicitudId },
        include: { solicitante: true } 
    });

    if (!solicitud) return NextResponse.json({ error: "No existe la solicitud" }, { status: 404 });

    let updateData: Prisma.SolicitudUpdateInput = {};
    const ahora = new Date();

    if (user.rol === "JEFE") {
      // El Jefe solo pasa el estado a "PENDIENTE" (para que lo vea Dirección) o lo RECHAZA
      // (A menos que la lógica sea que Jefe aprueba final, pero asumimos flujo de 2 pasos)
      updateData = {
        estado: accion === "aprobar" ? "PENDIENTE" : "RECHAZADO", // Sigue pendiente hasta que Dir. apruebe
        jefeAprobador: { connect: { id: user.id } },
        jefeAprobadoAt: ahora,
      };
    } else if (user.rol === "DIRECCION" || user.rol === "SUBDIRECCION") {
      // Dirección da el veredicto final
      updateData = {
        estado: accion === "aprobar" ? "APROBADO" : "RECHAZADO",
        direccionAprobador: { connect: { id: user.id } },
        direccionAprobadoAt: ahora,
      };

      // --- LÓGICA DE DESCUENTO DE DÍAS ---
      if (accion === "aprobar" && solicitud.estado !== "APROBADO") {
          // Calcular días (aproximado)
          const diffTime = Math.abs(solicitud.fechaFin.getTime() - solicitud.fechaInicio.getTime());
          // +1 porque si pido del 1 al 1, es 1 día
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

          if (solicitud.tipo === "VACACIONES") {
              if (solicitud.solicitante.diasVacaciones < diffDays) {
                   return NextResponse.json({ error: "El funcionario no tiene suficientes días de vacaciones." }, { status: 400 });
              }
              // Descontar
              await prisma.usuario.update({
                  where: { id: solicitud.solicitanteId },
                  data: { diasVacaciones: { decrement: diffDays } }
              });
          } else if (solicitud.tipo === "ADMINISTRATIVO") {
              if (solicitud.solicitante.diasAdministrativos < diffDays) {
                   return NextResponse.json({ error: "El funcionario no tiene suficientes días administrativos." }, { status: 400 });
              }
              // Descontar
              await prisma.usuario.update({
                  where: { id: solicitud.solicitanteId },
                  data: { diasAdministrativos: { decrement: diffDays } }
              });
          }
      }
      // -----------------------------------

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