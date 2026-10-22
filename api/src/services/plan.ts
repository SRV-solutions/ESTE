import { Feature, FEATURES, getPlan, IN_DEVELOPMENT, Plan } from '../config/plans';
import type Company from '../models/Company';
import { HttpError } from '../utils/http';
import { todayAR } from './subscription';

/** Lo que la empresa tiene hoy: su plan, o el acuerdo especial de SRV si está vigente. */
export interface EffectivePlan {
  id: Plan['id'];
  name: string;
  features: Feature[];
  inDevelopment: Feature[];
  maxUsers: number;
  maxTemporary: number;
  priceUsd: number;
  /** True cuando rige un acuerdo especial (precio y módulos definidos por SRV). */
  custom: boolean;
  deal: Deal | null;
}

export interface Deal {
  from: string | null;
  until: string | null;
  priceUsd: number;
  features: Feature[];
  maxUsers: number;
  maxTemporary: number;
  note: string | null;
  active: boolean;
}

type CompanyDeal = Pick<Company, 'plan' | 'monthlyPriceUsd' | 'dealFrom' | 'dealUntil' | 'dealPriceUsd' | 'dealFeatures' | 'dealMaxUsers' | 'dealMaxTemporary' | 'dealNote'>;

export const dealOf = (company: CompanyDeal): Deal | null => {
  if (company.dealPriceUsd == null) return null;
  const today = todayAR();
  const base = getPlan(company.plan);
  return {
    from: company.dealFrom,
    until: company.dealUntil,
    priceUsd: Number(company.dealPriceUsd),
    features: (company.dealFeatures as Feature[] | null) ?? base.features, // null: los módulos del plan
    maxUsers: company.dealMaxUsers ?? base.maxUsers,
    maxTemporary: company.dealMaxTemporary ?? base.maxTemporary,
    note: company.dealNote,
    active: (!company.dealFrom || company.dealFrom <= today) && (!company.dealUntil || company.dealUntil >= today),
  };
};

export const effectivePlan = (company: CompanyDeal): EffectivePlan => {
  const base = getPlan(company.plan);
  const deal = dealOf(company);
  if (deal?.active) {
    return { id: base.id, name: 'Acuerdo especial', features: deal.features, inDevelopment: IN_DEVELOPMENT, maxUsers: deal.maxUsers, maxTemporary: deal.maxTemporary, priceUsd: deal.priceUsd, custom: true, deal };
  }
  return { id: base.id, name: base.name, features: base.features, inDevelopment: IN_DEVELOPMENT, maxUsers: base.maxUsers, maxTemporary: base.maxTemporary, priceUsd: Number(company.monthlyPriceUsd), custom: false, deal };
};

/**
 * Un acuerdo especial vigente, o pactado para más adelante, fija las condiciones hasta su fecha de fin:
 * mientras tanto el plan solo lo cambia SRV (superadmin). Sin fecha de fin, queda fijo hasta que SRV lo quite.
 */
export const dealLocksPlan = (company: CompanyDeal) => {
  const deal = dealOf(company);
  return !!deal && (!deal.until || deal.until >= todayAR());
};

export const planHasFeature =(plan: EffectivePlan | null | undefined, feature: Feature) => !!plan?.features.includes(feature);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida el acuerdo que manda el Panel SRV. `null` lo quita. */
export const parseDeal = (body: unknown) => {
  if (body === null) return { dealFrom: null, dealUntil: null, dealPriceUsd: null, dealFeatures: null, dealMaxUsers: null, dealMaxTemporary: null, dealNote: null };
  const d = (body ?? {}) as Record<string, unknown>;
  const price = Number(d.priceUsd);
  if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'El precio del acuerdo tiene que ser un número (puede ser 0).', { priceUsd: 'Precio inválido.' });
  const from = d.from ? String(d.from) : null;
  const until = d.until ? String(d.until) : null;
  if ((from && !DATE_RE.test(from)) || (until && !DATE_RE.test(until))) throw new HttpError(400, 'Fechas del acuerdo inválidas.');
  if (from && until && until < from) throw new HttpError(400, 'El acuerdo termina antes de empezar.', { until: 'Tiene que ser posterior al inicio.' });
  let features: Feature[] | null = null;
  if (Array.isArray(d.features)) {
    const bad = d.features.filter((f) => !(f in FEATURES));
    if (bad.length) throw new HttpError(400, `Módulos desconocidos: ${bad.join(', ')}.`);
    features = d.features as Feature[];
  }
  const int = (v: unknown, label: string) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new HttpError(400, `${label} tiene que ser un entero mayor a 0.`);
    return n;
  };
  return {
    dealFrom: from,
    dealUntil: until,
    dealPriceUsd: price,
    dealFeatures: features,
    dealMaxUsers: int(d.maxUsers, 'El máximo de usuarios'),
    dealMaxTemporary: int(d.maxTemporary, 'El máximo de temporales'),
    dealNote: String(d.note ?? '').trim().slice(0, 2000) || null,
  };
};
