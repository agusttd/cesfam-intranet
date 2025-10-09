/*
  Warnings:

  - A unique constraint covering the columns `[rut]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rut` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SolicitudTipo" AS ENUM ('VACACIONES', 'ADMINISTRATIVO');

-- CreateEnum
CREATE TYPE "SolicitudEstado" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "LicenciaEstado" AS ENUM ('REGISTRADA', 'PROCESADA');

-- CreateEnum
CREATE TYPE "NotificacionTipo" AS ENUM ('SOLICITUD_NUEVA', 'SOLICITUD_APROBADA', 'SOLICITUD_RECHAZADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Rol" ADD VALUE 'DIRECCION';
ALTER TYPE "Rol" ADD VALUE 'JEFE';

-- AlterTable
ALTER TABLE "Documento" ADD COLUMN     "descripcion" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "jefeId" INTEGER,
ADD COLUMN     "rut" TEXT NOT NULL,
ADD COLUMN     "telefono" TEXT;

-- CreateTable
CREATE TABLE "Solicitud" (
    "id" SERIAL NOT NULL,
    "tipo" "SolicitudTipo" NOT NULL,
    "motivo" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "solicitanteId" INTEGER NOT NULL,
    "estado" "SolicitudEstado" NOT NULL DEFAULT 'PENDIENTE',
    "jefeAprobadorId" INTEGER,
    "jefeAprobadoAt" TIMESTAMP(3),
    "direccionAprobadorId" INTEGER,
    "direccionAprobadoAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Licencia" (
    "id" SERIAL NOT NULL,
    "funcionarioId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "archivoUrl" TEXT,
    "observacion" TEXT,
    "estado" "LicenciaEstado" NOT NULL DEFAULT 'REGISTRADA',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "tipo" "NotificacionTipo" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "usuarioId" INTEGER,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Solicitud_solicitanteId_idx" ON "Solicitud"("solicitanteId");

-- CreateIndex
CREATE INDEX "Solicitud_estado_idx" ON "Solicitud"("estado");

-- CreateIndex
CREATE INDEX "Licencia_funcionarioId_idx" ON "Licencia"("funcionarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_rut_key" ON "Usuario"("rut");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_jefeId_fkey" FOREIGN KEY ("jefeId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_jefeAprobadorId_fkey" FOREIGN KEY ("jefeAprobadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_direccionAprobadorId_fkey" FOREIGN KEY ("direccionAprobadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licencia" ADD CONSTRAINT "Licencia_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
