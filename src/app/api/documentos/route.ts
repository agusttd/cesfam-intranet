import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// Función auxiliar para validar el token
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

// GET → Listar documentos (Protegido: solo usuarios logueados)
export async function GET(req: Request) {
  const user = await getUserFromToken(req);
  if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const documentos = await prisma.documento.findMany({
    include: { creador: { select: { nombre: true } } }, // Solo traemos el nombre, no el password
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(documentos);
}

// POST → Subir documento (Protegido: Solo ADMIN, SUBDIRECCION, DIRECCION)
export async function POST(req: Request) {
  // 1. Autenticar con el Token
  const user = await getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // 2. Validar Permisos (Solo ciertos roles pueden subir)
  const rolesPermitidos = ["ADMIN", "SUBDIRECCION", "DIRECCION"];
  if (!rolesPermitidos.includes(user.rol)) {
    return NextResponse.json(
      { error: "No tienes permisos para subir documentos" },
      { status: 403 }
    );
  }

  // 3. Obtener datos (Ignoramos 'rol' o 'creadorId' si vienen en el body)
  const { titulo, url, descripcion } = await req.json();

  if (!titulo || !url) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  try {
      const nuevo = await prisma.documento.create({
        data: { 
            titulo, 
            url, 
            descripcion: descripcion || null,
            creadorId: user.id // Usamos el ID real del token
        },
      });
      return NextResponse.json(nuevo, { status: 201 });
  } catch (error) {
      console.error("Error subiendo documento:", error);
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}