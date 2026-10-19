import { Request, Response } from 'express';
import { isArcaConfigured, issuerInfo } from '../services/arca';
import { handleMercadoPagoPayment, quoteFor, startCheckout } from '../services/billing';
import { isMercadoPagoConfigured, isValidWebhookSignature } from '../services/mercadopago';
import { deleteByUrl, saveImage } from '../services/storage';
import { subscriptionState } from '../services/subscription';
import { Company, Invoice, Payment } from '../models';
import { HttpError, parseId } from '../utils/http';
import { parseCompanyInput } from './companyInput';

const findCompany = async (req: Request) => {
  const company = await Company.findByPk(req.user!.companyId!);
  if (!company) throw new HttpError(404, 'Empresa no encontrada.');
  return company;
};

/** Datos de la empresa y de su suscripción, para su administrador. */
export const getBilling = async (req: Request, res: Response) => {
  const company = await findCompany(req);
  const [payments, invoices, quote] = await Promise.all([
    Payment.findAll({ where: { companyId: company.id }, order: [['createdAt', 'DESC']], limit: 24 }),
    Invoice.findAll({ where: { companyId: company.id, status: 'issued' }, order: [['createdAt', 'DESC']], limit: 24 }),
    quoteFor(company).catch(() => null), // Si la cotización no responde, la pantalla igual carga.
  ]);
  res.json({
    company,
    subscription: subscriptionState(company),
    quote,
    payments,
    invoices,
    mercadoPagoEnabled: isMercadoPagoConfigured(),
    invoicingEnabled: isArcaConfigured(),
  });
};

export const updateCompany = async (req: Request, res: Response) => {
  const company = await findCompany(req);
  await company.update(parseCompanyInput(req.body, true));
  res.json(company);
};

/** Logo de la empresa: aparece arriba a la izquierda en la app y en los PDF de órdenes. */
export const uploadLogo = async (req: Request, res: Response) => {
  if (!req.file) throw new HttpError(400, 'Elegí una imagen.');
  const company = await findCompany(req);
  const previous = company.logoUrl;
  await company.update({ logoUrl: await saveImage(req.file.buffer, `empresas/${company.id}`, 'logo') });
  await deleteByUrl(previous);
  res.json(company);
};

export const deleteLogo = async (req: Request, res: Response) => {
  const company = await findCompany(req);
  const previous = company.logoUrl;
  await company.update({ logoUrl: null });
  await deleteByUrl(previous);
  res.json(company);
};

export const checkout = async (req: Request, res: Response) => {
  const { checkoutUrl, payment, quote } = await startCheckout(await findCompany(req));
  res.status(201).json({ checkoutUrl, paymentId: payment.id, quote });
};

/** Factura con todo lo necesario para imprimirla (incluye datos del emisor para el QR de ARCA). */
export const getInvoice = async (req: Request, res: Response) => {
  const where = { id: parseId(req.params.id), ...(req.user!.isSuperAdmin ? {} : { companyId: req.user!.companyId }) };
  const invoice = await Invoice.findOne({ where, include: [Company] });
  if (!invoice || invoice.status !== 'issued') throw new HttpError(404, 'Factura no encontrada.');
  res.json({ invoice, issuer: issuerInfo() });
};

/**
 * Aviso de Mercado Pago (público). Se valida la firma y después se consulta el pago real
 * a Mercado Pago: nunca se confía en lo que llega en el aviso.
 */
export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  const type = String(req.body?.type || req.query.type || req.query.topic || '');
  const dataId = String(req.body?.data?.id || req.query['data.id'] || req.query.id || '');
  if (type !== 'payment' || !dataId) return res.sendStatus(200);

  if (!isValidWebhookSignature(req.headers, dataId)) return res.sendStatus(401);

  try {
    const result = await handleMercadoPagoPayment(dataId);
    console.log('[eventbox] Webhook de Mercado Pago', dataId, result);
    res.sendStatus(200);
  } catch (err) {
    console.error('[eventbox] Error procesando webhook de Mercado Pago', dataId, err);
    res.sendStatus(500); // Mercado Pago reintenta.
  }
};
