import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
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

// GET → Listar comunicados (Protegido)
export async function GET(req: Request) {
  const user = await getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const comunicados = await prisma.comunicado.findMany({
    include: { autor: { select: { nombre: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(comunicados);
}

// POST → Crear comunicado (Protegido: Solo ADMIN, SUBDIRECCION, DIRECCION)
export async function POST(req: Request) {
  // 1. Autenticar
  const user = await getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // 2. Validar Rol
  const rolesPermitidos = ["ADMIN", "SUBDIRECCION", "DIRECCION"];
  if (!rolesPermitidos.includes(user.rol)) {
    return NextResponse.json(
      { error: "No tienes permisos para crear comunicados" },
      { status: 403 }
    );
  }

  // 3. Crear (Usando ID del token)
  const { titulo, contenido } = await req.json();

  if (!titulo || !contenido) {
      return NextResponse.json({ error: "Título y contenido son obligatorios" }, { status: 400 });
  }

  try {
      const nuevo = await prisma.comunicado.create({
        data: { 
            titulo, 
            contenido, 
            autorId: user.id // El autor es el usuario logueado
        },
      });
      return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
      console.error("Error creando comunicado:", error);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}