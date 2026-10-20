import { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/** Express 4 no captura errores de handlers async: este wrapper los manda al errorHandler. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const parseId = (value: unknown, label = 'id'): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `El ${label} es inválido.`);
  }
  return id;
};

export const parsePositiveInt = (value: unknown, label: string, max = 10000): number => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new HttpError(400, `${label} debe ser un número entero entre 1 y ${max}.`);
  }
  return n;
};

/** Devuelve solo las claves permitidas que vinieron en el body. */
export const pick = <T extends Record<string, unknown>>(body: T, keys: readonly string[]) => {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
};
