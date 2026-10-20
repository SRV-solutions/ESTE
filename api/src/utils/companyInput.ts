import { TAX_CONDITIONS } from '../models/Company';
import { HttpError, pick } from '../utils/http';

const FIELDS = ['name', 'legalName', 'cuit', 'taxCondition', 'email', 'phone', 'address', 'logoUrl'] as const;

/** Valida los datos de una empresa (los usa el admin de la empresa y el panel de SRV). */
export const parseCompanyInput = (body: Record<string, unknown>, partial = false) => {
  const data = pick(body, FIELDS);
  for (const key of Object.keys(data)) {
    const value = String(data[key] ?? '').trim();
    data[key] = value || null;
  }

  if (!partial || data.name !== undefined) {
    if (!data.name || String(data.name).length < 2) throw new HttpError(400, 'El nombre de la empresa es obligatorio.');
  }
  if (data.cuit) {
    const cuit = String(data.cuit).replace(/\D/g, '');
    if (!isValidCuit(cuit)) throw new HttpError(400, 'El CUIT no es válido.', { cuit: 'CUIT inválido (11 dígitos con verificador correcto).' });
    data.cuit = cuit;
  }
  if (data.taxCondition !== undefined) {
    if (!data.taxCondition) delete data.taxCondition;
    else if (!TAX_CONDITIONS.includes(data.taxCondition as never)) throw new HttpError(400, 'Condición frente al IVA inválida.');
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
    throw new HttpError(400, 'Email inválido.', { email: 'Email inválido.' });
  }
  if (data.logoUrl && !/^(https:\/\/|\/)/.test(String(data.logoUrl))) {
    throw new HttpError(400, 'El logo tiene que ser una URL https.', { logoUrl: 'Usá una URL que empiece con https://' });
  }
  return data;
};

/** Dígito verificador del CUIT/CUIL (módulo 11). */
export const isValidCuit = (cuit: string) => {
  if (!/^\d{11}$/.test(cuit)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(cuit[i]), 0);
  const mod = 11 - (sum % 11);
  const check = mod === 11 ? 0 : mod === 10 ? 9 : mod;
  return check === Number(cuit[10]);
};
