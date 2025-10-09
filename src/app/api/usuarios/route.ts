import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Función para verificar token y devolver usuario (Reutilizada)
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

// Helper para verificar rol de administrador/dirección
function checkAdminAccess(user: { rol: string }) {
  return user.rol === "ADMIN" || user.rol === "DIRECCION";
}

// GET: Listar todos los usuarios (Solo Admin/Dirección)
export async function GET(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    
    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Acceso denegado. Se requiere rol de Administración/Dirección." }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      // Excluimos la contraseña por seguridad
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        rut: true,
        telefono: true,
        cargo: true,
        jefeId: true,
        createdAt: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// POST: Crear nuevo usuario (Solo Admin/Dirección)
export async function POST(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    
    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Acceso denegado. Se requiere rol de Administración/Dirección." }, { status: 403 });
    }

    const body = await req.json();
    const { nombre, correo, password, rol, rut, telefono, cargo, jefeId } = body;

    if (!nombre || !correo || !password || !rol || !rut) {
      return NextResponse.json({ error: "Faltan datos obligatorios (nombre, correo, password, rol, rut)." }, { status: 400 });
    }

    // 1. Verificar si el correo o RUT ya existen
    const existingUser = await prisma.usuario.findFirst({
      where: { OR: [{ correo }, { rut }] },
    });
    
    if (existingUser) {
      return NextResponse.json({ error: "El correo o RUT ya están registrados." }, { status: 409 });
    }

    // 2. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Crear usuario
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        password: hashedPassword,
        rol, 
        rut,
        telefono,
        cargo,
        jefeId: jefeId ? parseInt(jefeId) : null, // Aceptar un jefeId opcional
      },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        rut: true,
        cargo: true,
      },
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    console.error("Error creando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}