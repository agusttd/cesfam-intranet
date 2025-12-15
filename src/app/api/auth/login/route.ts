import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// ¡Ya no importamos 'cookies'!


export async function POST(req: Request) {
    try {
        const { correo, password } = await req.json();

        // Buscar usuario (asegúrate que esté activo)
        const user = await prisma.usuario.findUnique({
            where: { correo, activo: true } // <-- Solo usuarios activos
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado o inactivo' }, { status: 401 });
        }

        // Validar contraseña
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
        }

        // Crear token JWT con rol
        const token = jwt.sign(
            { id: user.id, rol: user.rol }, 
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }
        );

        // --- CAMBIO PRINCIPAL: Devolver el Token y el Rol ---
        return NextResponse.json({ 
            token: token,
            rol: user.rol 
        });
        // --------------------------------------------------

    } catch (error) {
         console.error("Error en login:", error);
         return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}