import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la intranet CESFAM...");

  const hashedPassword = await bcrypt.hash("123456", 10);

  // Dirección
  const direccion = await prisma.usuario.create({
    data: {
      nombre: "Dirección CESFAM",
      correo: "direccion@cesfam.cl",
      password: hashedPassword,
      rol: "DIRECCION",
      rut: "11111111-1",
      telefono: "912345678",
      cargo: "Director CESFAM"
    }
  });

  // Subdirección
  const subdireccion = await prisma.usuario.create({
    data: {
      nombre: "Subdirección Administrativa",
      correo: "subdireccion@cesfam.cl",
      password: hashedPassword,
      rol: "SUBDIRECCION",
      rut: "22222222-2",
      telefono: "912345679",
      cargo: "Subdirección",
      jefeId: direccion.id
    }
  });

  // Jefe
  const jefe = await prisma.usuario.create({
    data: {
      nombre: "Jefe de Área",
      correo: "jefe@cesfam.cl",
      password: hashedPassword,
      rol: "JEFE",
      rut: "33333333-3",
      telefono: "912345680",
      cargo: "Jefe Administrativo",
      jefeId: subdireccion.id
    }
  });

  // Funcionario
  const funcionario = await prisma.usuario.create({
    data: {
      nombre: "Funcionario de Prueba",
      correo: "funcionario@cesfam.cl",
      password: hashedPassword,
      rol: "FUNCIONARIO",
      rut: "44444444-4",
      telefono: "912345681",
      cargo: "Asistente Administrativo",
      jefeId: jefe.id
    }
  });

  // Documento de ejemplo
  await prisma.documento.create({
    data: {
      titulo: "Reglamento Interno CESFAM",
      url: "https://ejemplo.com/reglamento.pdf",
      descripcion: "Documento de referencia para el personal",
      creadorId: subdireccion.id
    }
  });

  // Comunicado de ejemplo
  await prisma.comunicado.create({
    data: {
      titulo: "Reunión general del personal",
      contenido:
        "Se cita a todo el personal a reunión general el día lunes a las 09:00 hrs en sala de reuniones principal.",
      autorId: direccion.id
    }
  });

  // Solicitud de ejemplo
  await prisma.solicitud.create({
    data: {
      tipo: "VACACIONES",
      motivo: "Vacaciones familiares",
      fechaInicio: new Date("2025-12-20"),
      fechaFin: new Date("2026-01-05"),
      solicitanteId: funcionario.id
    }
  });

  // Licencia de ejemplo
  await prisma.licencia.create({
    data: {
      funcionarioId: funcionario.id,
      fechaInicio: new Date("2025-09-01"),
      fechaFin: new Date("2025-09-05"),
      archivoUrl: null,
      observacion: "Licencia médica por recuperación",
      estado: "REGISTRADA"
    }
  });

  // Notificación simulada
  await prisma.notificacion.create({
    data: {
      tipo: "SOLICITUD_NUEVA",
      mensaje: "Nueva solicitud de vacaciones enviada por Funcionario de Prueba.",
      usuarioId: jefe.id
    }
  });

  console.log("✅ Seed completado con éxito.");
  console.log("Usuarios de prueba creados:");
  console.log(`
  Dirección:      direccion@cesfam.cl / 123456
  Subdirección:   subdireccion@cesfam.cl / 123456
  Jefatura:       jefe@cesfam.cl / 123456
  Funcionario:    funcionario@cesfam.cl / 123456
  `);
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
