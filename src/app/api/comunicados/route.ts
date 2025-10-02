import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET → Listar todos los comunicados
export async function GET() {
  const comunicados = await prisma.comunicado.findMany({
    include: { autor: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(comunicados);
}

// POST → Crear un comunicado (solo admin/subdirección)
export async function POST(req: Request) {
  const { titulo, contenido, autorId, rol } = await req.json();

  if (rol !== "ADMIN" && rol !== "SUBDIRECCION") {
    return NextResponse.json(
      { error: "No tienes permisos para crear comunicados" },
      { status: 403 }
    );
  }

  const nuevo = await prisma.comunicado.create({
    data: { titulo, contenido, autorId },
  });

  return NextResponse.json(nuevo);
}
