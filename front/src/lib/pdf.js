import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_NAME } from '../config';
import { formatDate, formatDateTime, userName } from './format';
import { statusLabel } from './status';

const BLUE = [11, 120, 251];

export const loadImage = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve({ data: canvas.toDataURL('image/png'), ratio: img.naturalWidth / img.naturalHeight });
    };
    img.onerror = () => resolve(null); // Sin logo, el PDF se genera igual.
    img.src = url;
  });

/** Agrupa los ítems de la orden por categoría, contando también lo que va dentro de los contenedores. */
const summarize = (items) => {
  const rows = new Map();
  for (const item of items) {
    const cat = item.Category;
    const row = rows.get(cat.id) ?? { cat, count: 0, contents: 0 };
    row.count++;
    row.contents += item.contents?.length || 0;
    rows.set(cat.id, row);
  }
  return [...rows.values()].sort((a, b) => a.cat.code.localeCompare(b.cat.code));
};

/** PDF de la orden de servicio para el depósito: encabezado de la empresa, datos del evento y material. */
export const downloadOrderPdf = async (order, company = {}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const event = order.Event || {};
  const location = event.Location || {};

  // Encabezado
  const logo = company.logoUrl ? await loadImage(company.logoUrl) : null;
  if (logo) {
    const width = Math.min(18 * logo.ratio, 40); // 18 mm de alto, máximo 40 mm de ancho
    doc.addImage(logo.data, 'PNG', 14, 8, width, width / logo.ratio);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ORDEN DE SERVICIO', pageWidth / 2, 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text([company.name, company.address, company.phone].filter(Boolean).join(' · '), pageWidth / 2, 20, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`N° ${order.id}`, pageWidth - 14, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Emitida: ${formatDate(new Date())}`, pageWidth - 14, 19, { align: 'right' });
  doc.text(`Estado: ${statusLabel(order.status)}`, pageWidth - 14, 24, { align: 'right' });
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.6);
  doc.line(14, 29, pageWidth - 14, 29);

  // Datos del evento y de la orden
  const dash = (v) => v || '—';
  autoTable(doc, {
    startY: 33,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 }, 2: { fontStyle: 'bold', cellWidth: 32 } },
    body: [
      ['Evento', dash(event.eventName), 'Fecha del evento', formatDate(event.dateEvent)],
      ['Empresa', dash(event.organizer), 'Contacto', dash(event.producer)],
      ['Cliente final', dash(event.finalClient), 'Lugar', dash(location.locationName)],
      ['Dirección', dash(location.address), 'Ciudad', [location.city, location.country].filter(Boolean).join(', ') || '—'],
      ['Ingreso material', formatDateTime(order.incomeDate), 'Armado', formatDateTime(order.assemblyDate)],
      ['Desarme', formatDateTime(order.disassemblyDate), 'Egreso material', formatDateTime(order.outcomeDate)],
      ['Preparada por', dash(userName(order.OrderedBy)), 'Chequeada por', dash(userName(order.CheckedBy))],
      ['Armada por', dash(userName(order.DeployedBy)), '', ''],
      ['Observaciones', { content: dash(order.observations), colSpan: 3 }],
    ],
  });

  // Resumen por categoría
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Código', 'Categoría', 'Descripción', 'Cantidad', 'Ítems guardados dentro']],
    body: summarize(order.items).map(({ cat, count, contents }) => [
      cat.code,
      cat.name,
      cat.description || '—',
      count,
      cat.isContainer ? contents : '—',
    ]),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 0, 0] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  // Detalle de contenedores
  const containers = order.items.filter((i) => i.Category.isContainer && i.contents?.length);
  if (containers.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 6,
      head: [['Contenedor', 'Contenido']],
      body: containers.map((c) => [c.code, c.contents.map((x) => x.code).join(', ')]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: BLUE },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
    });
  }

  // Pie
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Generado con ${APP_NAME} · por SRV`, 14, doc.internal.pageSize.getHeight() - 8);
    doc.text(`${i} / ${pages}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    doc.setTextColor(0);
  }

  doc.save(`orden_de_servicio_${order.id}.pdf`);
};
