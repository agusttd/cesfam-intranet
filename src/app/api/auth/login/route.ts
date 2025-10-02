import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const { correo, password } = await req.json()

  // Buscar usuario
  const user = await prisma.usuario.findUnique({
    where: { correo }
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })
  }

  // Validar contraseña
  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  // Crear token JWT con rol
  const token = jwt.sign(
    { id: user.id, rol: user.rol },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  )

  return NextResponse.json({ token, rol: user.rol })
}
