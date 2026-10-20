import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { tenant } from '../middlewares/auth';
import { Event, Location, ServiceOrder, ServiceOrderItem } from '../models';
import { ServiceOrderStatus } from '../models/enums';
import { findAvailableItems } from '../services/itemService';
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
  res.json(
    await Event.findAll({
      where: { companyId: tenant(req) },
      include: [Location, { model: ServiceOrder, attributes: ['id', 'status'] }],
      order: [['dateEvent', 'DESC']],
    }),
  );
};

/**
 * Duplica un evento (por ejemplo, el mismo show en otra fecha). Con `copyMaterial`, crea una orden
 * nueva con la misma cantidad de ítems por categoría, tomando los que estén libres.
 */
export const duplicateEvent = async (req: Request, res: Response) => {
  const companyId = tenant(req);
  const source = await Event.findOne({ where: { id: parseId(req.params.id), companyId } });
  if (!source) throw new HttpError(404, 'Evento no encontrado.');
  if (!req.body.dateEvent) throw new HttpError(400, 'Elegí la fecha del evento nuevo.');

  const result = await sequelize.transaction(async (transaction) => {
    const event = await Event.create(
      {
        companyId,
        eventName: String(req.body.eventName || '').trim() || `${source.eventName} (copia)`,
        dateEvent: parseDate(req.body.dateEvent),
        locationId: source.locationId,
        organizer: source.organizer,
        producer: source.producer,
        finalClient: source.finalClient,
      },
      { transaction },
    );
    if (!req.body.copyMaterial) return { event, order: null, missing: [] };

    const sourceOrder = await ServiceOrder.findOne({ where: { eventId: source.id, companyId }, order: [['id', 'DESC']], transaction });
    if (!sourceOrder) return { event, order: null, missing: [] };

    const order = await ServiceOrder.create(
      {
        companyId,
        eventId: event.id,
        orderedBy: req.user!.id,
        checkedBy: sourceOrder.checkedBy,
        deployedBy: sourceOrder.deployedBy,
        logisticsBy: sourceOrder.logisticsBy,
        receptionBy: sourceOrder.receptionBy,
        observations: sourceOrder.observations,
        createdDate: new Date().toISOString().slice(0, 10),
        status: ServiceOrderStatus.Created,
      },
      { transaction },
    );

    // Cuántos ítems de cada categoría llevaba la orden original.
    const counts = await sequelize.query<{ categoryId: number; name: string; count: number }>(
      `SELECT i."categoryId", c.name, COUNT(*)::int AS count
         FROM "ServiceOrderItem" s JOIN "Item" i ON i.id = s."itemId" JOIN "Category" c ON c.id = i."categoryId"
        WHERE s."serviceOrderId" = :orderId GROUP BY i."categoryId", c.name`,
      { replacements: { orderId: sourceOrder.id }, type: QueryTypes.SELECT, transaction },
    );

    const missing: Array<{ category: string; wanted: number; added: number }> = [];
    for (const { categoryId, name, count } of counts) {
      const available = (await findAvailableItems(companyId, { categoryId, transaction })).slice(0, count);
      await ServiceOrderItem.bulkCreate(available.map((i) => ({ serviceOrderId: order.id, itemId: i.id })), { transaction });
      if (available.length < count) missing.push({ category: name, wanted: count, added: available.length });
    }
    return { event, order, missing };
  });

  res.status(201).json({
    message: result.order
      ? `Evento duplicado con su orden #${result.order.id}.${result.missing.length ? ' Faltó stock libre en algunas categorías.' : ''}`
      : 'Evento duplicado.',
    event: await Event.findByPk(result.event.id, { include: [Location] }),
    orderId: result.order?.id ?? null,
    missing: result.missing,
  });
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
