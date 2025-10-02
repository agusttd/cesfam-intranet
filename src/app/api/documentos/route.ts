import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET → Listar documentos
export async function GET() {
  const documentos = await prisma.documento.findMany({
    include: { creador: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(documentos);
}

// POST → Subir documento (solo admin/subdirección)
export async function POST(req: Request) {
  const { titulo, url, creadorId, rol } = await req.json();

  if (rol !== "ADMIN" && rol !== "SUBDIRECCION") {
    return NextResponse.json(
      { error: "No tienes permisos para subir documentos" },
      { status: 403 }
    );
  }

  const nuevo = await prisma.documento.create({
    data: { titulo, url, creadorId },
  });

  return NextResponse.json(nuevo);
}
