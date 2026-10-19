import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { Company, Invoice, Payment } from '../models';
import { HttpError } from '../utils/http';
import { ArcaError, isArcaConfigured, issueVoucher } from './arca';
import { getBlueRate, usdToArs } from './dollar';
import { createCheckout, getMpPayment, isMercadoPagoConfigured } from './mercadopago';
import { addMonths, nextPeriod, todayAR } from './subscription';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const periodLabel = (period: string) => `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}`;

/** Cuánto paga la empresa por el próximo mes, convertido a pesos con el dólar blue de ahora. */
export const quoteFor = async (company: Company) => {
  const rate = await getBlueRate();
  const amountUsd = Number(company.monthlyPriceUsd);
  const { period, from, to } = nextPeriod(company);
  return { period, periodLabel: periodLabel(period), from, to, amountUsd, rate, amountArs: usdToArs(amountUsd, rate.sell) };
};

/** Crea (o reutiliza) el pago pendiente del próximo mes y devuelve el link de Mercado Pago. */
export const startCheckout = async (company: Company) => {
  if (!isMercadoPagoConfigured()) throw new HttpError(503, 'El cobro con Mercado Pago todavía no está habilitado. Contactá a SRV.');
  const quote = await quoteFor(company);

  // Si ya hay un checkout de hoy para el mismo mes y monto, se reutiliza (no se duplican pagos).
  const existing = await Payment.findOne({
    where: {
      companyId: company.id,
      period: quote.period,
      status: 'pending',
      amountArs: quote.amountArs,
      mpPreferenceId: { [Op.ne]: null },
      createdAt: { [Op.gte]: new Date(Date.now() - 24 * 3600_000) },
    },
  });
  const payment =
    existing ??
    (await Payment.create({
      companyId: company.id,
      period: quote.period,
      amountUsd: quote.amountUsd,
      exchangeRate: quote.rate.sell,
      amountArs: quote.amountArs,
      method: 'mercadopago',
    }));

  const { preferenceId, checkoutUrl } = await createCheckout({
    paymentId: payment.id,
    title: `Sortex · suscripción ${quote.periodLabel} · ${company.name}`,
    amountArs: quote.amountArs,
    payerEmail: company.email,
  });
  await payment.update({ mpPreferenceId: preferenceId });
  return { payment, checkoutUrl, quote };
};

/** Marca el pago como aprobado y extiende la suscripción un mes desde donde corresponda. */
const approve = async (payment: Payment, data: { mpPaymentId?: string; paidAt?: Date }, t: Transaction) => {
  const company = await Company.findByPk(payment.companyId, { lock: t.LOCK.UPDATE, transaction: t });
  if (!company) throw new HttpError(404, 'Empresa no encontrada.');
  const today = todayAR();
  const base = company.paidUntil && company.paidUntil >= today ? company.paidUntil : dayBefore(today);
  await company.update({ paidUntil: addMonths(base, 1) }, { transaction: t });
  await payment.update(
    { status: 'approved', mpPaymentId: data.mpPaymentId ?? payment.mpPaymentId, paidAt: data.paidAt ?? new Date() },
    { transaction: t },
  );
  return company;
};

/** Ayer: si estaba vencida, el mes pago arranca hoy (paidUntil = ayer + 1 mes). */
const dayBefore = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) - 86400_000).toISOString().slice(0, 10);

/**
 * Emite (o reintenta) la factura de un pago aprobado. Si ARCA falla, queda registrada como
 * `failed` con el motivo, para reintentar desde el panel de SRV.
 */
export const invoicePayment = async (paymentId: number) => {
  const payment = await Payment.findByPk(paymentId, { include: [Company, Invoice] });
  if (!payment || !payment.Company) throw new HttpError(404, 'Pago no encontrado.');
  if (payment.status !== 'approved') throw new HttpError(409, 'Solo se factura un pago aprobado.');
  if (payment.Invoice?.status === 'issued') return payment.Invoice;

  const company = payment.Company;
  const from = `${payment.period}-01`;
  const to = new Date(Date.UTC(Number(payment.period.slice(0, 4)), Number(payment.period.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const base = {
    companyId: company.id,
    paymentId: payment.id,
    amountArs: payment.amountArs,
    receiverName: company.legalName || company.name,
    receiverTaxCondition: company.taxCondition,
    serviceFrom: from,
    serviceTo: to,
  };

  try {
    return await sequelize.transaction(async (t) => {
      const voucher = await issueVoucher(
        { amountArs: Number(payment.amountArs), serviceFrom: from, serviceTo: to, receiver: { cuit: company.cuit, taxCondition: company.taxCondition } },
        t,
      );
      const data = { ...base, ...voucher, status: 'issued' as const, error: null };
      if (payment.Invoice) return payment.Invoice.update(data, { transaction: t });
      return Invoice.create(data, { transaction: t });
    });
  } catch (err) {
    const message = err instanceof ArcaError || err instanceof HttpError ? err.message : 'Error inesperado al emitir la factura.';
    if (!(err instanceof ArcaError)) console.error('[sortex] Error al facturar el pago', payment.id, err);
    const failed = { ...base, status: 'failed' as const, error: message };
    return payment.Invoice ? payment.Invoice.update(failed) : Invoice.create(failed);
  }
};

/** Procesa el aviso de Mercado Pago: consulta el pago real y lo aplica una sola vez. */
export const handleMercadoPagoPayment = async (mpPaymentId: string) => {
  const mpPayment = await getMpPayment(mpPaymentId);
  const paymentId = Number(mpPayment.external_reference);
  if (!Number.isInteger(paymentId)) return { ignored: 'sin referencia de Sortex' };

  const result = await sequelize.transaction(async (t) => {
    const payment = await Payment.findByPk(paymentId, { lock: t.LOCK.UPDATE, transaction: t });
    if (!payment) return { ignored: 'pago inexistente' };
    if (payment.status === 'approved') return { ignored: 'ya aprobado' };

    if (mpPayment.status === 'approved') {
      const paidEnough = mpPayment.currency_id === 'ARS' && mpPayment.transaction_amount + 0.01 >= Number(payment.amountArs);
      if (!paidEnough) {
        console.error('[sortex] Pago de Mercado Pago con monto distinto', mpPayment.id, mpPayment.transaction_amount, payment.amountArs);
        return { ignored: 'monto distinto' };
      }
      await approve(payment, { mpPaymentId: String(mpPayment.id), paidAt: mpPayment.date_approved ? new Date(mpPayment.date_approved) : undefined }, t);
      return { approved: payment.id };
    }
    if (['rejected', 'cancelled'].includes(mpPayment.status)) {
      await payment.update({ status: mpPayment.status === 'rejected' ? 'rejected' : 'cancelled', mpPaymentId: String(mpPayment.id) }, { transaction: t });
    }
    return { status: mpPayment.status };
  });

  if ('approved' in result && isArcaConfigured()) await invoicePayment(result.approved as number);
  return result;
};

/** Pago registrado a mano por SRV (transferencia, efectivo…). Se aprueba en el acto. */
export const registerManualPayment = async (company: Company, opts: { invoice: boolean }) => {
  const quote = await quoteFor(company);
  const payment = await sequelize.transaction(async (t) => {
    const p = await Payment.create(
      {
        companyId: company.id,
        period: quote.period,
        amountUsd: quote.amountUsd,
        exchangeRate: quote.rate.sell,
        amountArs: quote.amountArs,
        method: 'manual',
      },
      { transaction: t },
    );
    await approve(p, {}, t);
    return p;
  });
  const invoice = opts.invoice && isArcaConfigured() ? await invoicePayment(payment.id) : null;
  return { payment, invoice };
};
