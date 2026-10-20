import { Request, Response } from 'express';
import { tenant } from '../middlewares/auth';
import { Location } from '../models';
import { parseCoords } from '../utils/geo';
import { HttpError, parseId, pick } from '../utils/http';

const FIELDS = ['locationName', 'address', 'city', 'country'] as const;

const clean = (body: Record<string, unknown>) => {
  const data = pick(body, FIELDS);
  for (const key of Object.keys(data)) data[key] = String(data[key] ?? '').trim();
  return data;
};

/** Coordenadas del lugar (opcionales): se usan para el check-in por geolocalización. */
const coords = (body: Record<string, unknown>) => (body.lat !== undefined || body.lng !== undefined ? parseCoords(body.lat, body.lng) : {});

export const listLocations = async (req: Request, res: Response) => {
  res.json(await Location.findAll({ where: { companyId: tenant(req) }, order: [['locationName', 'ASC']] }));
};

export const createLocation = async (req: Request, res: Response) => {
  const data = clean(req.body);
  if (FIELDS.some((f) => !data[f])) throw new HttpError(400, 'Todos los campos de la ubicación son obligatorios.');
  res.status(201).json(await Location.create({ ...data, ...coords(req.body), companyId: tenant(req) }));
};

export const updateLocation = async (req: Request, res: Response) => {
  const location = await Location.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) } });
  if (!location) throw new HttpError(404, 'Ubicación no encontrada.');

  const data = clean(req.body);
  if (Object.values(data).some((v) => !v)) throw new HttpError(400, 'Los campos de la ubicación no pueden quedar vacíos.');
  await location.update({ ...data, ...coords(req.body) });
  res.json(location);
};
