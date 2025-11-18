import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "No token provided" }, { status: 401 });

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        nombre: true, 
        rol: true, 
        // Aquí traemos los días
        diasVacaciones: true, 
        diasAdministrativos: true 
      }
    });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}