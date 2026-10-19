import { Request, Response } from 'express';
import { tenant } from '../middlewares/auth';
import { Event, Location } from '../models';
import { HttpError, parseId } from '../utils/http';

const TEXT_FIELDS = ['eventName', 'organizer', 'producer', 'finalClient'] as const;

const parseDate = (value: unknown) => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new HttpError(400, 'La fecha del evento es inválida.');
  return date;
};

const assertLocation = async (companyId: number, locationId: unknown) => {
  const location = await Location.findOne({ where: { id: parseId(locationId, 'lugar'), companyId } });
  if (!location) throw new HttpError(404, 'El lugar no existe.');
};

export const listEvents = async (req: Request, res: Response) => {
  res.json(await Event.findAll({ where: { companyId: tenant(req) }, include: [Location], order: [['dateEvent', 'DESC']] }));
};

export const createEvent = async (req: Request, res: Response) => {
  const { dateEvent, locationId } = req.body;
  const missing = TEXT_FIELDS.filter((f) => !String(req.body[f] ?? '').trim());
  if (!dateEvent || !locationId || missing.length) {
    throw new HttpError(400, 'Completá nombre, fecha, lugar, organizador, productor y cliente final.');
  }
  await assertLocation(tenant(req), locationId);

  const event = await Event.create({
    companyId: tenant(req),
    eventName: req.body.eventName.trim(),
    organizer: req.body.organizer.trim(),
    producer: req.body.producer.trim(),
    finalClient: req.body.finalClient.trim(),
    dateEvent: parseDate(dateEvent),
    locationId,
  });
  res.status(201).json(await Event.findByPk(event.id, { include: [Location] }));
};

export const updateEvent = async (req: Request, res: Response) => {
  const event = await Event.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) } });
  if (!event) throw new HttpError(404, 'Evento no encontrado.');

  const updates: Record<string, unknown> = {};
  for (const field of TEXT_FIELDS) {
    if (req.body[field] !== undefined) {
      const value = String(req.body[field]).trim();
      if (!value) throw new HttpError(400, 'Los datos del evento no pueden quedar vacíos.');
      updates[field] = value;
    }
  }
  if (req.body.dateEvent !== undefined) updates.dateEvent = parseDate(req.body.dateEvent);
  if (req.body.locationId !== undefined) {
    await assertLocation(tenant(req), req.body.locationId);
    updates.locationId = req.body.locationId;
  }

  await event.update(updates);
  res.json(await Event.findByPk(event.id, { include: [Location] }));
};
