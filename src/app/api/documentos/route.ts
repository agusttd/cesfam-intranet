import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken"; // <--- IMPORTAR JWT

const prisma = new PrismaClient();

// --- AÑADIR ESTA FUNCIÓN ---
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
// -------------------------

// GET → Listar documentos (Ya estaba bien, pero necesita autenticación)
export async function GET(req: Request) { // <--- Añadir req
  const user = await getUserFromToken(req); // <--- Añadir autenticación
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const documentos = await prisma.documento.findMany({
    include: { creador: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(documentos);
}

// POST → Subir documento (CORREGIDO)
export async function POST(req: Request) {
  // 1. OBTENER USUARIO DEL TOKEN
  const user = await getUserFromToken(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // 2. VERIFICAR ROL DEL TOKEN
  if (user.rol !== "ADMIN" && user.rol !== "SUBDIRECCION" && user.rol !== "DIRECCION") {
    return NextResponse.json(
      { error: "No tienes permisos para subir documentos" },
      { status: 403 }
    );
  }

  // 3. Obtener datos del body (SIN rol NI creadorId)
  const { titulo, url, descripcion } = await req.json();

  if (!titulo || !url) {
      return NextResponse.json({ error: "Título y URL son obligatorios" }, { status: 400 });
  }

  const nuevo = await prisma.documento.create({
    data: { 
        titulo, 
        url, 
        descripcion: descripcion || null,
        creadorId: user.id // 4. USAR ID DEL TOKEN
    },
  });

  return NextResponse.json(nuevo, { status: 201 });
}