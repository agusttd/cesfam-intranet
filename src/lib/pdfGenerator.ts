import jsPDF from 'jspdf';
import { Solicitud } from '@/lib/types'; // Asegúrate de tener los tipos importados

export const generateSolicitudPDF = (solicitud: any) => {
  const doc = new jsPDF();
  const margin = 20;
  let y = 20;

  // --- Encabezado ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SOLICITUD DE PERMISO / FERIADO", 105, y, { align: "center" });
  y += 10;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("CESFAM SANTA ROSA - TEMUCO", 105, y, { align: "center" });
  y += 20;

  // --- Datos del Funcionario ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("I. IDENTIFICACIÓN DEL FUNCIONARIO", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  // Nombre
  doc.text(`Nombre:`, margin, y);
  doc.text(`${solicitud.solicitante.nombre.toUpperCase()}`, margin + 30, y);
  y += 8;

  // Rut (Si lo tenemos, si no placeholder)
  doc.text(`RUT:`, margin, y);
  doc.text(`${solicitud.solicitante.rut || 'No registrado'}`, margin + 30, y);
  y += 8;

  // Cargo
  doc.text(`Cargo:`, margin, y);
  doc.text(`${solicitud.solicitante.cargo || 'Funcionario'}`, margin + 30, y);
  y += 15;

  // --- Detalles de la Solicitud ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("II. DETALLE DE LA SOLICITUD", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Tipo
  doc.text(`Tipo de Permiso:`, margin, y);
  const tipoTexto = solicitud.tipo === 'VACACIONES' ? 'FERIADO LEGAL (Vacaciones)' : 'PERMISO ADMINISTRATIVO';
  doc.text(tipoTexto, margin + 35, y);
  y += 8;

  // Fechas
  const fechaInicio = new Date(solicitud.fechaInicio).toLocaleDateString('es-CL');
  const fechaFin = new Date(solicitud.fechaFin).toLocaleDateString('es-CL');
  
  doc.text(`Desde: ${fechaInicio}`, margin, y);
  doc.text(`Hasta: ${fechaFin}`, margin + 60, y);
  y += 8;

  // Motivo
  if (solicitud.motivo) {
      doc.text(`Motivo: ${solicitud.motivo}`, margin, y);
      y += 8;
  }

  y += 15;

  // --- Resolución (Solo si está aprobado) ---
  if (solicitud.estado === 'APROBADO') {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("III. RESOLUCIÓN", margin, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Estado: APROBADO", margin, y);
      y += 8;
      doc.text("Autorizado por Jefatura y Dirección.", margin, y);
      y += 20;
      
      // Firmas Simuladas
      doc.line(margin, y, margin + 60, y); // Línea firma 1
      doc.line(margin + 80, y, margin + 140, y); // Línea firma 2
      y += 5;
      doc.text("Firma Funcionario", margin + 10, y);
      doc.text("Firma Jefatura / Dirección", margin + 90, y);
  } else {
      doc.setTextColor(150);
      doc.text("(Documento no válido hasta su aprobación)", margin, y);
      doc.setTextColor(0);
  }

  // --- Pie de página ---
  doc.setFontSize(8);
  doc.text(`Generado el: ${new Date().toLocaleString('es-CL')}`, margin, 280);
  doc.text("Sistema Intranet CESFAM", 150, 280);

  // Guardar
  doc.save(`Solicitud_${solicitud.tipo}_${solicitud.id}.pdf`);
};