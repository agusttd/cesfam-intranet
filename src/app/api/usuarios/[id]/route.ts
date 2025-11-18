import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

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

function canManageUsers(userRol: string) {
  return ["ADMIN", "DIRECCION", "SUBDIRECCION"].includes(userRol);
}

// PUT: Actualizar usuario
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    
    if (!canManageUsers(user.rol)) {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const usuarioId = parseInt(params.id);
    const body = await req.json();
    const { nombre, correo, password, rol, rut, telefono, cargo, jefeId, diasVacaciones, diasAdministrativos } = body;

    const updateData: Prisma.UsuarioUpdateInput = {
      nombre,
      correo,
      rol,
      rut,
      telefono,
      cargo,
      // Actualizar días si vienen en el body
      diasVacaciones: diasVacaciones !== undefined ? parseInt(diasVacaciones) : undefined,
      diasAdministrativos: diasAdministrativos !== undefined ? parseInt(diasAdministrativos) : undefined,
      
      jefe: jefeId ? { connect: { id: parseInt(jefeId) } } : undefined, 
    };
    
    if (jefeId === "0" || jefeId === null) {
        updateData.jefe = { disconnect: true };
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    if (user.id === usuarioId && rol && !canManageUsers(rol)) {
        return NextResponse.json({ error: "No puedes degradar tu propio rol." }, { status: 403 });
    }

    const actualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: updateData,
      select: { id: true, nombre: true, correo: true, rol: true, diasVacaciones: true, diasAdministrativos: true },
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// DELETE: Soft Delete
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    if (!user || !canManageUsers(user.rol)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const usuarioId = parseInt(params.id);
    if (user.id === usuarioId) {
        return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 403 });
    }
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { activo: false }
    });
    return NextResponse.json({ message: "Usuario desactivado correctamente" });
  } catch (error) {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}