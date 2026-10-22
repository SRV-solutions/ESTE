import { Request, Response } from 'express';
import { searchCompany } from '../services/search';

/** Buscador general (arriba a la derecha): devuelve solo lo que la persona puede ver. */
export const search = async (req: Request, res: Response) => {
  const query = String(req.query.q ?? '').trim().slice(0, 80);
  if (query.length < 2) {
    res.json({ results: [] });
    return;
  }
  res.json({ results: await searchCompany(req.user!, query) });
};
