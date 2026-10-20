import { env } from '../config/env';
import type Company from '../models/Company';

export type AccessState = 'active' | 'grace' | 'blocked' | 'suspended';

const DAY = 24 * 60 * 60 * 1000;

/** Fecha de hoy en Argentina, `YYYY-MM-DD`. */
export const todayAR = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);

export const addMonths = (date: string, months: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  // 31/01 + 1 mes = 28/02 (o 29), no 03/03.
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);

/**
 * Estado de acceso de una empresa:
 * - active: suscripción al día.
 * - grace: venció hace menos de `graceDays`; puede seguir usando Event Box con aviso.
 * - blocked: venció hace más; solo puede entrar a pagar.
 * - suspended: suspendida a mano desde el panel de SRV.
 */
export const subscriptionState = (company: Pick<Company, 'status' | 'paidUntil'>) => {
  const today = todayAR();
  const paidUntil = company.paidUntil;
  const daysLeft = paidUntil ? daysBetween(today, paidUntil) : -Infinity;
  let state: AccessState;
  if (company.status === 'suspended') state = 'suspended';
  else if (daysLeft >= 0) state = 'active';
  else if (daysLeft >= -env.billing.graceDays) state = 'grace';
  else state = 'blocked';
  return {
    state,
    paidUntil,
    daysLeft: Number.isFinite(daysLeft) ? daysLeft : null,
    blocksOn: paidUntil ? addDays(paidUntil, env.billing.graceDays + 1) : null,
  };
};

export const canUseApp = (state: AccessState) => state === 'active' || state === 'grace';

/** Último día del mes `YYYY-MM`. */
export const monthEnd = (period: string) =>
  new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).toISOString().slice(0, 10);

/**
 * El abono es por mes calendario y se paga a principio de mes.
 * Si el mes actual ya está pago, el próximo a pagar es el siguiente; si no, el actual.
 */
export const nextPeriod = (company: Pick<Company, 'paidUntil'>) => {
  const current = todayAR().slice(0, 7);
  const coversCurrent = !!company.paidUntil && company.paidUntil >= monthEnd(current);
  const period = coversCurrent ? addDays(company.paidUntil!, 1).slice(0, 7) : current;
  return { period, from: `${period}-01`, to: monthEnd(period) };
};

/** Lo que la empresa debe del mes en curso (para mostrarle solo eso). */
export const currentMonthStatus = (company: Pick<Company, 'paidUntil'>) => {
  const period = todayAR().slice(0, 7);
  const paid = !!company.paidUntil && company.paidUntil >= monthEnd(period);
  return {
    period,
    paid,
    /** Se paga a principio de mes: hasta este día se puede usar sin haber pagado. */
    dueDate: `${period}-${String(Math.min(env.billing.graceDays, 28)).padStart(2, '0')}`,
  };
};
