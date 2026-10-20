import { HttpError, pick } from './http';

const EDITABLE = ['code', 'name', 'description', 'type', 'unity', 'value', 'weight', 'isStorable', 'isContainer'] as const;

/** Normaliza y valida los datos de una categoría. `partial` permite omitir campos (edición). */
export const parseCategoryInput = (body: Record<string, unknown>, partial = false) => {
  const data = pick(body, EDITABLE);
  for (const key of ['code', 'name', 'description', 'type', 'unity'] as const) {
    if (data[key] !== undefined) data[key] = String(data[key] ?? '').trim();
  }
  for (const key of ['value', 'weight'] as const) {
    if (data[key] !== undefined) {
      const n = Number(data[key]);
      if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `El campo ${key === 'value' ? 'valor' : 'peso'} debe ser un número positivo.`);
      data[key] = n;
    }
  }
  for (const key of ['isStorable', 'isContainer'] as const) {
    if (data[key] !== undefined) data[key] = Boolean(data[key]);
  }
  // El código es el prefijo de cada ítem (`HDMI-12`): sin espacios para que se pueda escanear y buscar.
  if (data.code !== undefined && /\s/.test(String(data.code))) {
    throw new HttpError(400, 'El código de la categoría no puede tener espacios (ej: HDMI o BAUL-AZUL).');
  }

  const required = ['code', 'name', 'type', 'unity', 'value', 'weight'] as const;
  const missing = required.filter((k) => (partial ? data[k] === '' : data[k] === undefined || data[k] === ''));
  if (missing.length) throw new HttpError(400, `Faltan datos obligatorios: ${missing.join(', ')}.`);

  return data;
};
