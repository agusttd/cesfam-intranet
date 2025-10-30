import { NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
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

// PUT: Actualizar usuario (Solo Admin/Dirección)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    
    if (!checkAdminAccess(user)) {
      return NextResponse.json({ error: "Acceso denegado. Se requiere rol de Administración/Dirección." }, { status: 403 });
    }

    const usuarioId = parseInt(params.id);
    const body = await req.json();
    const { nombre, correo, password, rol, rut, telefono, cargo, jefeId } = body;

    const updateData: Prisma.UsuarioUpdateInput = {
      nombre,
      correo,
      rol,
      rut,
      telefono,
      cargo,
      jefe: jefeId ? { connect: { id: parseInt(jefeId) } } : { disconnect: true }, // Usar connect/disconnect para relaciones
    };
    
    // Si se proporciona una nueva contraseña, la hasheamos
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Si el usuario intenta cambiarse a sí mismo a un rol no administrativo, podría perder acceso.
    if (user.id === usuarioId && rol && !checkAdminAccess({ rol })) {
        // Esto es una medida de seguridad básica
        return NextResponse.json({ error: "No puedes degradar tu propio rol a uno sin privilegios administrativos." }, { status: 403 });
    }


    const actualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: updateData,
      select: { id: true, nombre: true, correo: true, rol: true, rut: true, cargo: true },
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

// DELETE: Desactivar usuario (Soft Delete)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken(req);
    if (!user || !["ADMIN", "DIRECCION"].includes(user.rol)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const usuarioId = parseInt(params.id);
    if (user.id === usuarioId) {
        return NextResponse.json({ error: "No puedes eliminar tu propia cuenta mientras estás logueado." }, { status: 403 });
    }

    // Cambiar a update para soft delete
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { activo: false }, 
    });

    return NextResponse.json({ message: "Usuario desactivado correctamente" });
  } catch (error) {
    console.error("Error desactivando usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}