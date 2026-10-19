import { api, errorMessage } from './api';

/** Descarga la factura en PDF (el generador y el QR se cargan recién al usarlos). */
export const downloadInvoice = async (id, notify) => {
  try {
    const [{ data }, { downloadInvoicePdf }] = await Promise.all([api.get(`/billing/invoices/${id}`), import('./invoicePdf')]);
    await downloadInvoicePdf(data);
  } catch (err) {
    notify(errorMessage(err, 'No se pudo generar la factura.'), 'error');
  }
};

export const voucherLabel = (inv) =>
  inv?.voucherNumber ? `C ${String(inv.pointOfSale).padStart(5, '0')}-${String(inv.voucherNumber).padStart(8, '0')}` : '—';
