import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { APP_NAME } from '../config';
import { formatDate } from './format';
import { formatArs, periodLabel, taxConditionLabel } from './money';

const VOUCHER_NAMES = { 11: { letter: 'C', name: 'FACTURA' } };
const DOC_TYPES = { 80: 'CUIT', 96: 'DNI', 99: 'Consumidor final' };

const pad = (n, size) => String(n ?? 0).padStart(size, '0');

/** QR obligatorio de ARCA (RG 4892): JSON en base64 en la URL de verificación. */
const arcaQr = (invoice, issuer) => {
  const data = {
    ver: 1,
    fecha: new Date(invoice.issuedAt || invoice.createdAt).toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }),
    cuit: Number(issuer.cuit),
    ptoVta: invoice.pointOfSale,
    tipoCmp: invoice.voucherType,
    nroCmp: invoice.voucherNumber,
    importe: Number(invoice.amountArs),
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: invoice.receiverDocType,
    nroDocRec: Number(invoice.receiverDocNumber || 0),
    tipoCodAut: 'E',
    codAut: Number(invoice.cae),
  };
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return QRCode.toDataURL(`https://www.afip.gob.ar/fe/qr/?p=${payload}`, { margin: 0, width: 220 });
};

/** Factura electrónica en PDF, con el formato que pide ARCA. */
export const downloadInvoicePdf = async ({ invoice, issuer }) => {
  const voucher = VOUCHER_NAMES[invoice.voucherType] || { letter: '?', name: 'COMPROBANTE' };
  const number = `${pad(invoice.pointOfSale, 5)}-${pad(invoice.voucherNumber, 8)}`;
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const company = invoice.Company || {};

  // Encabezado: emisor | letra | datos del comprobante
  doc.setDrawColor(0);
  doc.rect(10, 10, W - 20, 48);
  doc.line(W / 2, 22, W / 2, 58);
  doc.rect(W / 2 - 9, 10, 18, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(voucher.letter, W / 2, 21, { align: 'center' });
  doc.setFontSize(6);
  doc.text(`COD. ${pad(invoice.voucherType, 2)}`, W / 2, 25, { align: 'center' });

  doc.setFontSize(13);
  doc.text(issuer.name || 'Emisor', 14, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    [issuer.address && `Domicilio: ${issuer.address}`, `Condición frente al IVA: ${issuer.taxCondition}`].filter(Boolean),
    14,
    30,
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(voucher.name, W / 2 + 12, 20);
  doc.setFontSize(9);
  doc.text(`Punto de venta: ${pad(invoice.pointOfSale, 5)}   Comp. Nro: ${pad(invoice.voucherNumber, 8)}`, W / 2 + 12, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    [
      `Fecha de emisión: ${formatDate(invoice.issuedAt)}`,
      `CUIT: ${issuer.cuit}`,
      issuer.grossIncome && `Ingresos Brutos: ${issuer.grossIncome}`,
      issuer.activityStart && `Inicio de actividades: ${issuer.activityStart}`,
    ].filter(Boolean),
    W / 2 + 12,
    37,
  );

  // Período y receptor
  autoTable(doc, {
    startY: 62,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38 }, 2: { fontStyle: 'bold', cellWidth: 38 } },
    body: [
      ['Período facturado', `${formatDate(invoice.serviceFrom)} al ${formatDate(invoice.serviceTo)}`, 'Vto. para el pago', formatDate(invoice.issuedAt)],
      [DOC_TYPES[invoice.receiverDocType] || 'Documento', invoice.receiverDocType === 99 ? '—' : invoice.receiverDocNumber, 'Condición frente al IVA', taxConditionLabel(invoice.receiverTaxCondition)],
      ['Razón social', invoice.receiverName || company.name || '—', 'Domicilio', company.address || '—'],
      ['Condición de venta', 'Contado / Mercado Pago', '', ''],
    ],
  });

  // Detalle
  const period = invoice.serviceFrom ? periodLabel(invoice.serviceFrom.slice(0, 7)) : '';
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    head: [['Descripción', 'Cantidad', 'Precio unitario', 'Subtotal']],
    body: [[`Suscripción mensual a ${APP_NAME} (plataforma de stock y órdenes de servicio) — ${period}`, '1', formatArs(invoice.amountArs), formatArs(invoice.amountArs)]],
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [0, 0, 0] },
    columnStyles: { 1: { halign: 'right', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 35 } },
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Importe total: ${formatArs(invoice.amountArs)}`, W - 14, y, { align: 'right' });

  // CAE + QR
  y += 12;
  const qr = await arcaQr(invoice, issuer);
  doc.addImage(qr, 'PNG', 14, y, 32, 32);
  doc.setFontSize(10);
  doc.text('Comprobante autorizado por ARCA', 52, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`CAE N°: ${invoice.cae}`, 52, y + 16);
  doc.text(`Vencimiento del CAE: ${formatDate(invoice.caeExpiresAt)}`, 52, y + 23);

  if (!issuer.production) {
    doc.setTextColor(200, 0, 0);
    doc.setFontSize(10);
    doc.text('HOMOLOGACIÓN — COMPROBANTE DE PRUEBA SIN VALIDEZ FISCAL', W / 2, 285, { align: 'center' });
    doc.setTextColor(0);
  }

  doc.save(`factura_${voucher.letter}_${number}.pdf`);
};
