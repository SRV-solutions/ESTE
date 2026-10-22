import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { hasPermission, type AuthUser } from '../middlewares/auth';
import { Blueprint, Category, Employee, Event, Location, Role, ServiceOrder, User } from '../models';
import { Action, Entity } from '../models/enums';
import { SearchIndex } from '../utils/searchEngine';
import { planHasFeature } from './plan';
import type { Feature } from '../config/plans';

/**
 * Buscador general: un índice en memoria por empresa con sus categorías, órdenes, eventos, lugares,
 * personas y planos. Se arma la primera vez que alguien busca y se rehace cuando la empresa cambia
 * algo (o al minuto). Los ítems se buscan por código directo en la base, con su índice.
 */

export type HitKind = 'category' | 'item' | 'order' | 'event' | 'location' | 'person' | 'blueprint';

export interface Hit {
  kind: HitKind;
  id: number;
  title: string;
  subtitle: string;
  path: string;
  boost?: number;
}

/** Quién puede ver cada tipo de resultado (el mismo permiso que la pantalla). */
const ACCESS: Record<HitKind, { entity: Entity; feature?: Feature }> = {
  category: { entity: Entity.CATEGORIES },
  item: { entity: Entity.ITEMS },
  order: { entity: Entity.SERVICE_ORDERS },
  event: { entity: Entity.EVENTS },
  location: { entity: Entity.LOCATIONS },
  person: { entity: Entity.USERS },
  blueprint: { entity: Entity.BLUEPRINTS, feature: 'blueprints' },
};

const canSee = (user: AuthUser, kind: HitKind) => {
  const rule = ACCESS[kind];
  return hasPermission(user, rule.entity, Action.READ) && (!rule.feature || planHasFeature(user.plan, rule.feature));
};

const STATUS_LABEL: Record<string, string> = {
  created: 'Creada', in_review: 'En revisión', approved: 'Aprobada', rejected: 'Rechazada', in_process: 'Armando', ready: 'Lista',
  dispatched: 'Despachada', delivered: 'En el evento', returning: 'Volviendo', received: 'Recibida', under_review: 'Revisando material', disassembled: 'Desarmada',
};

const dateAR = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '');
const fullName = (u: { firstname?: string | null; lastname?: string | null; username?: string }) =>
  [u.firstname, u.lastname].filter(Boolean).join(' ') || u.username || '';
const q = (s: string) => encodeURIComponent(s);

const build = async (companyId: number) => {
  const ix = new SearchIndex<Hit>();
  const [categories, events, locations, orders, people, blueprints] = await Promise.all([
    Category.findAll({ where: { companyId }, attributes: ['id', 'code', 'name', 'type', 'description', 'isActive', 'isContainer'] }),
    Event.findAll({ where: { companyId }, attributes: ['id', 'eventName', 'dateEvent', 'organizer', 'producer', 'finalClient'], include: [{ model: Location, attributes: ['locationName'] }] }),
    Location.findAll({ where: { companyId }, attributes: ['id', 'locationName', 'address', 'city'] }),
    ServiceOrder.findAll({
      where: { companyId },
      attributes: ['id', 'status'],
      include: [{ model: Event, as: 'Event', attributes: ['eventName', 'dateEvent'], include: [{ model: Location, attributes: ['locationName'] }] }],
      order: [['id', 'DESC']],
      limit: 5000,
    }),
    User.findAll({
      where: { companyId },
      attributes: ['id', 'username', 'firstname', 'lastname', 'email', 'dni', 'disabledAt', 'access'],
      include: [{ model: Role, attributes: ['roleName'] }, { model: Employee, attributes: ['position', 'area'], required: false }],
    }),
    Blueprint.findAll({ where: { companyId }, attributes: ['id', 'title', 'description', 'fileName'], include: [{ model: Event, attributes: ['eventName'] }] }),
  ]);

  for (const c of categories) {
    ix.add(
      {
        kind: 'category',
        id: c.id,
        title: c.name,
        subtitle: `Categoría ${c.code}${c.isContainer ? ' · contenedor' : ''}${c.isActive ? '' : ' · desactivada'}`,
        path: `/items?categoria=${c.id}`,
        boost: c.isActive ? 0 : -0.1,
      },
      [[c.name, 1], [c.code, 1], [c.type, 0.6], [c.description, 0.4], [c.isContainer ? 'contenedor' : '', 0.5]],
    );
  }
  for (const e of events) {
    const place = (e as Event & { Location?: Location }).Location?.locationName ?? '';
    ix.add(
      { kind: 'event', id: e.id, title: e.eventName, subtitle: [dateAR(e.dateEvent), place, e.finalClient].filter(Boolean).join(' · '), path: `/events?buscar=${q(e.eventName)}` },
      [[e.eventName, 1], [place, 0.6], [e.organizer, 0.6], [e.producer, 0.5], [e.finalClient, 0.6]],
    );
  }
  for (const l of locations) {
    ix.add(
      { kind: 'location', id: l.id, title: l.locationName, subtitle: [l.address, l.city].filter(Boolean).join(', '), path: `/locations?ver=${l.id}` },
      [[l.locationName, 1], [l.city, 0.6], [l.address, 0.5]],
    );
  }
  for (const o of orders) {
    const ev = o.Event as (Event & { Location?: Location }) | undefined;
    ix.add(
      {
        kind: 'order',
        id: o.id,
        title: `Orden #${o.id}${ev ? ` · ${ev.eventName}` : ''}`,
        subtitle: [STATUS_LABEL[o.status] ?? o.status, ev?.Location?.locationName, dateAR(ev?.dateEvent)].filter(Boolean).join(' · '),
        path: `/service-orders/${o.id}`,
        boost: o.status === 'disassembled' ? -0.05 : 0.03,
      },
      [[String(o.id), 1], [ev?.eventName, 0.9], [ev?.Location?.locationName, 0.5], [STATUS_LABEL[o.status], 0.4]],
    );
  }
  for (const p of people) {
    const emp = (p as User & { Employee?: Employee }).Employee as (Employee & { position?: string | null; area?: string | null }) | undefined;
    ix.add(
      {
        kind: 'person',
        id: p.id,
        title: fullName(p),
        subtitle: [`@${p.username}`, p.Role?.roleName, emp?.position, p.disabledAt ? 'desactivada' : null].filter(Boolean).join(' · '),
        path: `/team?ver=${p.id}`,
        boost: p.disabledAt ? -0.1 : 0,
      },
      [[p.firstname, 1], [p.lastname, 1], [p.username, 1], [p.email, 0.6], [p.dni, 0.9], [p.Role?.roleName, 0.5], [emp?.position, 0.5], [emp?.area, 0.4]],
    );
  }
  for (const b of blueprints) {
    const evName = (b as Blueprint & { Event?: Event }).Event?.eventName ?? '';
    ix.add(
      { kind: 'blueprint', id: b.id, title: b.title, subtitle: `Plano${evName ? ` · ${evName}` : ''}`, path: `/blueprints?buscar=${q(b.title)}` },
      [[b.title, 1], [b.description, 0.5], [evName, 0.6], [b.fileName, 0.4], ['plano', 0.3]],
    );
  }
  return ix;
};

const TTL = 60_000;
const cache = new Map<number, { at: number; index: Promise<SearchIndex<Hit>> }>();

/** La empresa cambió algo: el próximo pedido rehace su índice. */
export const invalidateSearch = (companyId: number | null | undefined) => {
  if (companyId) cache.delete(companyId);
};

const indexFor = (companyId: number) => {
  const hit = cache.get(companyId);
  if (hit && Date.now() - hit.at < TTL) return hit.index;
  const index = build(companyId);
  cache.set(companyId, { at: Date.now(), index });
  index.catch(() => cache.delete(companyId));
  return index;
};

/** Ítems por código ("HDMI-12", "hdmi 12", "baul-3"): consulta directa, usa el índice por código. */
const findItems = async (companyId: number, query: string): Promise<Hit[]> => {
  const code = query.trim().toUpperCase().replace(/\s+/g, '-');
  if (!/^[A-Z0-9][A-Z0-9_-]{1,40}$/.test(code) || !/\d|-/.test(code)) return [];
  const rows = await sequelize.query<{ id: number; code: string; isActive: boolean; name: string }>(
    `SELECT i.id, i.code, i."isActive", c.name
       FROM "Item" i JOIN "Category" c ON c.id = i."categoryId"
      WHERE i."companyId" = :companyId AND upper(i.code) LIKE :prefix
      ORDER BY length(i.code), i.code
      LIMIT 6`,
    { replacements: { companyId, prefix: `${code.replace(/[\\%_]/g, '\\$&')}%` }, type: QueryTypes.SELECT },
  );
  return rows.map((r) => ({
    kind: 'item' as const,
    id: r.id,
    title: r.code,
    subtitle: `${r.name}${r.isActive ? '' : ' · desactivado'}`,
    path: `/items?buscar=${q(r.code)}`,
  }));
};

export const searchCompany = async (user: AuthUser, query: string, limit = 24) => {
  const companyId = user.companyId!;
  const [index, items] = await Promise.all([indexFor(companyId), canSee(user, 'item') ? findItems(companyId, query) : Promise.resolve([])]);
  const hits = index.search(query, { limit, filter: (doc) => canSee(user, doc.kind) }).map((r) => r.doc);
  return [...items, ...hits].map(({ boost: _boost, ...h }) => h);
};

/** Middleware: si un pedido cambió datos de una empresa, su índice se rehace en la próxima búsqueda. */
export const refreshSearchOnChange = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    res.on('finish', () => {
      if (res.statusCode < 400) invalidateSearch(req.user?.companyId);
    });
  }
  next();
};
