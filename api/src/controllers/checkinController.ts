import { Request, Response } from 'express';
import { env } from '../config/env';
import { tenant } from '../middlewares/auth';
import { CheckIn, Event, Location, ServiceOrder, User } from '../models';
import { distanceMeters, parseCoords } from '../utils/geo';
import { HttpError, parseId } from '../utils/http';

/**
 * Check-in / check-out del material en el evento (plan Empresa).
 * El teléfono manda su ubicación; si está dentro del radio del lugar, queda como "en el lugar".
 * Si está lejos, la API lo avisa y la app pide confirmación antes de registrarlo igual.
 */

const USER_BRIEF = ['id', 'username', 'firstname', 'lastname', 'avatarUrl'];
const orderInclude = [{ model: Event, as: 'Event', attributes: ['id', 'eventName', 'dateEvent'], include: [{ model: Location, attributes: ['id', 'locationName', 'lat', 'lng'] }] }];

const findOrder = async (req: Request) => {
  const order = await ServiceOrder.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) }, include: orderInclude });
  if (!order) throw new HttpError(404, 'Orden de servicio no encontrada.');
  return order;
};

export const createCheckIn = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  const kind = req.body.kind === 'out' ? 'out' : req.body.kind === 'in' ? 'in' : null;
  if (!kind) throw new HttpError(400, 'Indicá si es check-in (llegada) o check-out (retiro).');
  const { lat, lng } = parseCoords(req.body.lat, req.body.lng);
  const accuracy = req.body.accuracy !== undefined && req.body.accuracy !== null ? Math.round(Number(req.body.accuracy)) : null;
  const note = String(req.body.note ?? '').trim().slice(0, 500) || null;

  const place = order.Event?.Location;
  const hasPlace = place?.lat != null && place?.lng != null;
  const distanceM = hasPlace && lat != null && lng != null ? distanceMeters(lat, lng, place!.lat!, place!.lng!) : null;
  const radiusM = env.checkinRadiusM;
  const onSite = distanceM != null && distanceM <= radiusM;

  // Lejos del lugar: se avisa y solo se registra si la persona confirma (force).
  if (hasPlace && distanceM != null && !onSite && !req.body.force) {
    throw new HttpError(409, `Estás a ${distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM} m`} de ${place!.locationName}. ¿Registrar igual?`, {
      distanceM: String(distanceM),
      radiusM: String(radiusM),
      confirm: 'true',
    });
  }

  const record = await CheckIn.create({ companyId: order.companyId, serviceOrderId: order.id, userId: req.user!.id, kind, lat, lng, accuracy, distanceM, onSite, note });
  const created = await CheckIn.findByPk(record.id, { include: [{ model: User, attributes: USER_BRIEF }] });
  const label = kind === 'in' ? 'Check-in' : 'Check-out';
  res.status(201).json({
    message: onSite ? `${label} registrado en ${place!.locationName}.` : hasPlace ? `${label} registrado (fuera del lugar).` : `${label} registrado${lat == null ? ' sin ubicación' : ''}.`,
    checkIn: created,
  });
};

export const listOrderCheckIns = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  const place = order.Event?.Location;
  const rows = await CheckIn.findAll({ where: { serviceOrderId: order.id }, include: [{ model: User, attributes: USER_BRIEF }], order: [['createdAt', 'DESC']] });
  res.json({ place: place ? { id: place.id, name: place.locationName, lat: place.lat, lng: place.lng } : null, radiusM: env.checkinRadiusM, checkIns: rows });
};

/** Últimos check-ins de la empresa (pantalla Check-in / out). */
export const listCheckIns = async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = await CheckIn.findAll({
    where: { companyId: tenant(req) },
    include: [{ model: User, attributes: USER_BRIEF }, { model: ServiceOrder, attributes: ['id', 'status'], include: orderInclude }],
    order: [['createdAt', 'DESC']],
    limit,
  });
  res.json({ radiusM: env.checkinRadiusM, checkIns: rows });
};
