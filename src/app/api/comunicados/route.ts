import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET: listar comunicados
export async function GET() {
  const comunicados = await prisma.comunicado.findMany({
    include: { autor: true },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json(comunicados)
}

// POST: crear comunicado
export async function POST(req: Request) {
  const { titulo, contenido, autorId } = await req.json()
  const nuevo = await prisma.comunicado.create({
    data: { titulo, contenido, autorId }
  })
  return NextResponse.json(nuevo)
}
