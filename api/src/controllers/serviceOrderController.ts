import { Request, Response } from 'express';
import { literal, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import {
  Category,
  Event,
  Item,
  Location,
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderStoreItem,
  StoreItem,
  User,
} from '../models';
import { planHas } from '../config/plans';
import { tenant } from '../middlewares/auth';
import { ServiceOrderStatus } from '../models/enums';
import { findAvailableItems, pickAvailableItems } from '../services/itemService';
import { accessFor, assertCanEdit, canChangeStatus, canEditOrder, canTransfer } from '../services/serviceOrderPolicy';
import { HttpError, parseId, parsePositiveInt } from '../utils/http';
import { compareCodes } from '../utils/itemCode';

const USER_BRIEF = ['id', 'username', 'firstname', 'lastname', 'email'];
const MAX_PER_ADD = 500;

const orderIncludes = [
  { model: Event, as: 'Event', include: [Location] },
  { model: User, as: 'OrderedBy', attributes: USER_BRIEF },
  { model: User, as: 'CheckedBy', attributes: USER_BRIEF },
  { model: User, as: 'DeployedBy', attributes: USER_BRIEF },
  { model: User, as: 'LogisticsBy', attributes: USER_BRIEF },
  { model: User, as: 'ReceptionBy', attributes: USER_BRIEF },
  { model: ServiceOrder, as: 'TransferredTo', attributes: ['id', 'status'] },
];

/** Responsables que se pueden asignar en cada orden (los dos últimos, solo en planes con responsables por etapa). */
const RESPONSIBLES = [
  { field: 'checkedBy', label: 'quien chequea' },
  { field: 'deployedBy', label: 'quien arma' },
  { field: 'logisticsBy', label: 'responsable de logística', feature: true },
  { field: 'receptionBy', label: 'responsable de recepción', feature: true },
] as const;

const parseResponsibles = async (req: Request, companyId: number) => {
  const out: Record<string, number | null> = {};
  for (const r of RESPONSIBLES) {
    if (req.body[r.field] === undefined) continue;
    if ('feature' in r && req.body[r.field] && !planHas(req.user!.plan, 'stageOwners')) {
      throw new HttpError(403, 'Los responsables de logística y recepción son parte del plan Profesional.');
    }
    out[r.field] = await assertUser(companyId, req.body[r.field], r.label);
  }
  return out;
};

const DATE_FIELDS = ['incomeDate', 'assemblyDate', 'disassemblyDate', 'outcomeDate'] as const;
const DATE_LABELS: Record<(typeof DATE_FIELDS)[number], string> = {
  incomeDate: 'ingreso de material',
  assemblyDate: 'armado',
  disassemblyDate: 'desarme',
  outcomeDate: 'egreso de material',
};

/** Las fechas son opcionales, pero si están deben respetar ingreso ≤ armado ≤ desarme ≤ egreso. */
const parseDates = (body: Record<string, unknown>, current: Partial<Record<string, Date | null>> = {}) => {
  const out: Record<string, Date | null> = {};
  for (const field of DATE_FIELDS) {
    if (body[field] === undefined) continue;
    if (body[field] === null || body[field] === '') {
      out[field] = null;
      continue;
    }
    const date = new Date(String(body[field]));
    if (Number.isNaN(date.getTime())) throw new HttpError(400, `La fecha de ${DATE_LABELS[field]} es inválida.`);
    out[field] = date;
  }

  const merged = DATE_FIELDS.map((f) => ({ f, d: f in out ? out[f] : current[f] ?? null }));
  let prev: { f: (typeof DATE_FIELDS)[number]; d: Date } | null = null;
  for (const { f, d } of merged) {
    if (!d) continue;
    if (prev && new Date(d) < new Date(prev.d)) {
      throw new HttpError(400, `La fecha de ${DATE_LABELS[f]} no puede ser anterior a la de ${DATE_LABELS[prev.f]}.`);
    }
    prev = { f, d };
  }
  return out;
};

/** Valida que el responsable sea un usuario de la misma empresa. */
const assertUser = async (companyId: number, id: unknown, label: string) => {
  if (id === null || id === '' || id === undefined) return null;
  const user = await User.findOne({ where: { id: parseId(id, label), companyId } });
  if (!user) throw new HttpError(404, `El usuario elegido como ${label} no existe.`);
  if (user.access === 'none') throw new HttpError(400, `${user.firstname || 'Esa persona'} no usa la app: no puede ser ${label}.`);
  return user.id;
};

const findOrder = async (req: Request, transaction?: Transaction) => {
  const order = await ServiceOrder.findOne({ where: { id: parseId(req.params.id, 'id de la orden'), companyId: tenant(req) }, transaction });
  if (!order) throw new HttpError(404, 'Orden de servicio no encontrada.');
  return order;
};

// ---------- Órdenes ----------

export const listServiceOrders = async (req: Request, res: Response) => {
  const orders = await ServiceOrder.findAll({
    where: { companyId: tenant(req) },
    attributes: {
      include: [
        [literal('(SELECT COUNT(*) FROM "ServiceOrderItem" s WHERE s."serviceOrderId" = "ServiceOrder"."id")::int'), 'itemCount'],
      ],
    },
    include: orderIncludes,
    order: [['id', 'DESC']],
  });
  res.json(orders);
};

export const createServiceOrder = async (req: Request, res: Response) => {
  const user = req.user!;
  const companyId = tenant(req);
  const event = await Event.findOne({ where: { id: parseId(req.body.eventId, 'evento'), companyId } });
  if (!event) throw new HttpError(404, 'El evento no existe.');

  const orderedBy = (await assertUser(companyId, req.body.orderedBy, 'responsable')) ?? user.id;
  if (orderedBy !== user.id && !user.isAdmin) {
    throw new HttpError(403, 'Solo un administrador puede crear órdenes a nombre de otra persona.');
  }

  const order = await ServiceOrder.create({
    companyId,
    eventId: event.id,
    orderedBy,
    ...(await parseResponsibles(req, companyId)),
    createdDate: req.body.createdDate || new Date().toISOString().slice(0, 10),
    observations: req.body.observations?.trim() || null,
    status: ServiceOrderStatus.Created,
    ...parseDates(req.body),
  });
  res.status(201).json(order);
};

/**
 * Detalle con el contenido armado: cada contenedor trae `contents` (fijos + los cargados en esta
 * orden) y `access` dice qué puede hacer el usuario actual.
 */
export const getServiceOrder = async (req: Request, res: Response) => {
  const order = await ServiceOrder.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) }, include: orderIncludes });
  if (!order) throw new HttpError(404, 'Orden de servicio no encontrada.');

  const rows = await ServiceOrderItem.findAll({
    where: { serviceOrderId: order.id },
    include: [{ model: Item, include: [Category] }],
  });

  const containerIds = rows.filter((r) => r.Item?.Category?.isContainer).map((r) => r.itemId);
  const childInclude = [{ model: Item, as: 'Child', include: [Category] }];
  const [orderContents, permanentContents] = containerIds.length
    ? await Promise.all([
        ServiceOrderStoreItem.findAll({ where: { serviceOrderId: order.id, itemIdParent: containerIds }, include: childInclude }),
        StoreItem.findAll({ where: { itemIdParent: containerIds }, include: childInclude }),
      ])
    : [[], []];

  const items = rows
    .filter((r) => r.Item)
    .map((r) => {
      const item = r.Item!.toJSON();
      if (!r.Item!.Category?.isContainer) return item;

      const permanent = permanentContents
        .filter((c) => c.itemIdParent === r.itemId && c.Child)
        .map((c) => ({ ...c.Child!.toJSON(), source: 'permanent' }));
      const temporary = orderContents
        .filter((c) => c.itemIdParent === r.itemId && c.Child)
        .map((c) => ({ ...c.Child!.toJSON(), source: 'order' }));

      return {
        ...item,
        contents: [...permanent, ...temporary].sort((a, b) => compareCodes(a.code, b.code)),
        // Un contenedor con contenido fijo viaja tal cual: no se le cargan ítems por orden.
        acceptsOrderContents: permanent.length === 0,
      };
    })
    .sort((a, b) => compareCodes(a.code, b.code));

  // Órdenes que le pasaron su material a esta (traspaso directo entre eventos).
  const transferredFrom = await ServiceOrder.findAll({
    where: { transferredToId: order.id, companyId: order.companyId },
    attributes: ['id'],
    include: [{ model: Event, as: 'Event', attributes: ['id', 'eventName'] }],
  });

  res.json({ ...order.toJSON(), items, transferredFrom, access: accessFor(req.user!, order) });
};

/**
 * Edita responsables, observaciones y fechas. El estado se cambia con PATCH /:id/status.
 * Los responsables se pueden reasignar durante todo el recorrido (admin o quien creó la orden);
 * fechas y observaciones, solo mientras la orden se puede editar.
 */
export const updateServiceOrder = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  const user = req.user!;
  const onlyResponsibles = Object.keys(req.body).every((k) => RESPONSIBLES.some((r) => r.field === k));
  const canReassign = order.status !== ServiceOrderStatus.Disassembled && (user.isAdmin || order.orderedBy === user.id);
  if (!(onlyResponsibles && canReassign)) assertCanEdit(user, order);

  const updates: Record<string, unknown> = {
    ...parseDates(req.body, order.get({ plain: true })),
    ...(await parseResponsibles(req, order.companyId)),
  };
  if (req.body.observations !== undefined) updates.observations = String(req.body.observations).trim() || null;

  await order.update(updates);
  res.json(await ServiceOrder.findByPk(order.id, { include: orderIncludes }));
};

export const changeStatus = async (req: Request, res: Response) => {
  const status = req.body.status as ServiceOrderStatus;
  if (!Object.values(ServiceOrderStatus).includes(status)) throw new HttpError(400, 'Estado inválido.');

  const order = await findOrder(req);
  if (!canChangeStatus(req.user!, order, status)) {
    throw new HttpError(403, 'No podés pasar la orden a ese estado (no sigue el flujo o no te corresponde).');
  }

  // Al desarmar, los ítems quedan inactivos en la orden y vuelven a estar libres.
  const isActive = status !== ServiceOrderStatus.Disassembled;
  await sequelize.transaction(async (transaction) => {
    await order.update({ status }, { transaction });
    await ServiceOrderItem.update({ isActive }, { where: { serviceOrderId: order.id }, transaction });
    await ServiceOrderStoreItem.update({ isActive }, { where: { serviceOrderId: order.id }, transaction });
  });

  res.json({ message: 'Estado actualizado.', status, access: accessFor(req.user!, order) });
};

// ---------- Ítems de la orden ----------

/** Agrega un ítem puntual (`itemId`) o N ítems libres de una categoría (`categoryId` + `quantity`). */
export const addItems = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  assertCanEdit(req.user!, order);

  const added = await sequelize.transaction(async (transaction) => {
    let items: Item[];
    if (req.body.itemId) {
      const itemId = parseId(req.body.itemId, 'ítem');
      const available = await findAvailableItems(order.companyId, { transaction });
      const item = available.find((i) => i.id === itemId);
      if (!item) throw new HttpError(409, 'Ese ítem no está disponible (en uso, desactivado o dentro de un contenedor).');
      items = [item];
    } else {
      const categoryId = parseId(req.body.categoryId, 'categoría');
      const quantity = parsePositiveInt(req.body.quantity ?? 1, 'La cantidad', MAX_PER_ADD);
      items = await pickAvailableItems(order.companyId, categoryId, quantity, { transaction });
    }
    await ServiceOrderItem.bulkCreate(
      items.map((item) => ({ serviceOrderId: order.id, itemId: item.id })),
      { transaction },
    );
    return items.length;
  });

  res.status(201).json({ message: `${added} ítem(s) agregado(s) a la orden.` });
};

export const removeItem = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  assertCanEdit(req.user!, order);
  const itemId = parseId(req.params.itemId, 'ítem');

  await sequelize.transaction(async (transaction) => {
    const deleted = await ServiceOrderItem.destroy({ where: { serviceOrderId: order.id, itemId }, transaction });
    if (!deleted) throw new HttpError(404, 'Ese ítem no está en la orden.');
    // Si era un contenedor, lo que se había cargado adentro para esta orden sale con él.
    await ServiceOrderStoreItem.destroy({ where: { serviceOrderId: order.id, itemIdParent: itemId }, transaction });
  });

  res.json({ message: 'Ítem quitado de la orden.' });
};

export const removeAllItems = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  assertCanEdit(req.user!, order);

  const deleted = await sequelize.transaction(async (transaction) => {
    await ServiceOrderStoreItem.destroy({ where: { serviceOrderId: order.id }, transaction });
    return ServiceOrderItem.destroy({ where: { serviceOrderId: order.id }, transaction });
  });

  res.json({ message: `Se quitaron ${deleted} ítem(s) de la orden.` });
};

/**
 * Reemplaza un ítem de la orden por otro libre de la misma categoría. Sirve para ítems sueltos,
 * contenedores (el contenido cargado en la orden pasa al nuevo) y contenido cargado en un contenedor.
 */
export const swapItem = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  assertCanEdit(req.user!, order);
  const oldId = parseId(req.params.itemId, 'ítem');
  const newId = parseId(req.body.newItemId, 'ítem nuevo');

  await sequelize.transaction(async (transaction) => {
    const [oldItem, available] = await Promise.all([
      Item.findOne({ where: { id: oldId, companyId: order.companyId }, transaction }),
      findAvailableItems(order.companyId, { transaction }),
    ]);
    const newItem = available.find((i) => i.id === newId);
    if (!oldItem) throw new HttpError(404, 'El ítem a reemplazar no existe.');
    if (!newItem) throw new HttpError(409, 'El ítem nuevo no está disponible.');
    if (newItem.categoryId !== oldItem.categoryId) throw new HttpError(400, 'El reemplazo tiene que ser de la misma categoría.');

    const direct = await ServiceOrderItem.findOne({ where: { serviceOrderId: order.id, itemId: oldId }, transaction });
    if (direct) {
      const movedContents = await ServiceOrderStoreItem.count({
        where: { serviceOrderId: order.id, itemIdParent: oldId },
        transaction,
      });
      if (movedContents && (await StoreItem.count({ where: { itemIdParent: newId }, transaction }))) {
        throw new HttpError(409, 'El contenedor nuevo ya tiene contenido fijo: no puede recibir lo cargado en esta orden.');
      }
      await direct.update({ itemId: newId }, { transaction });
      await ServiceOrderStoreItem.update(
        { itemIdParent: newId },
        { where: { serviceOrderId: order.id, itemIdParent: oldId }, transaction },
      );
      return;
    }

    const [stored] = await ServiceOrderStoreItem.update(
      { itemIdChild: newId },
      { where: { serviceOrderId: order.id, itemIdChild: oldId }, transaction },
    );
    if (!stored) throw new HttpError(404, 'Ese ítem no está cargado en la orden (o es contenido fijo de un contenedor).');
  });

  res.json({ message: 'Ítem reemplazado.' });
};

// ---------- Contenido de contenedores dentro de la orden ----------

const findOrderContainer = async (order: ServiceOrder, containerId: number, transaction?: Transaction) => {
  const row = await ServiceOrderItem.findOne({
    where: { serviceOrderId: order.id, itemId: containerId },
    include: [{ model: Item, include: [Category] }],
    transaction,
  });
  if (!row?.Item) throw new HttpError(404, 'El contenedor no está en esta orden: agregalo primero.');
  if (!row.Item.Category?.isContainer) throw new HttpError(400, 'Ese ítem no es un contenedor.');
  if (await StoreItem.count({ where: { itemIdParent: containerId }, transaction })) {
    throw new HttpError(409, 'Ese contenedor tiene contenido fijo: viaja tal cual y no se le cargan ítems por orden.');
  }
  return row.Item;
};

export const addContainerItems = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  assertCanEdit(req.user!, order);
  const containerId = parseId(req.params.containerId, 'contenedor');
  const categoryId = parseId(req.body.categoryId, 'categoría');
  const quantity = parsePositiveInt(req.body.quantity ?? 1, 'La cantidad', MAX_PER_ADD);

  const container = await sequelize.transaction(async (transaction) => {
    const container = await findOrderContainer(order, containerId, transaction);
    // El contenedor ya está en la orden (ocupado), así que nunca aparece entre los disponibles.
    const items = await pickAvailableItems(order.companyId, categoryId, quantity, { storableOnly: true, transaction });

    await ServiceOrderStoreItem.bulkCreate(
      items.map((item) => ({ serviceOrderId: order.id, itemIdParent: containerId, itemIdChild: item.id })),
      { transaction },
    );
    return container;
  });

  res.status(201).json({ message: `${quantity} ítem(s) guardado(s) en ${container.code}.` });
};

export const removeContainerItem = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  assertCanEdit(req.user!, order);

  const deleted = await ServiceOrderStoreItem.destroy({
    where: {
      serviceOrderId: order.id,
      itemIdParent: parseId(req.params.containerId, 'contenedor'),
      itemIdChild: parseId(req.params.itemId, 'ítem'),
    },
  });
  if (!deleted) throw new HttpError(404, 'Ese ítem no está cargado en el contenedor para esta orden.');
  res.json({ message: 'Ítem quitado del contenedor.' });
};

/** Vacía lo que se cargó en el contenedor para esta orden (el contenido fijo no se toca). */
export const emptyContainer = async (req: Request, res: Response) => {
  const order = await findOrder(req);
  assertCanEdit(req.user!, order);
  const containerId = parseId(req.params.containerId, 'contenedor');

  const deleted = await ServiceOrderStoreItem.destroy({ where: { serviceOrderId: order.id, itemIdParent: containerId } });
  res.json({ message: deleted ? `Se sacaron ${deleted} ítem(s) del contenedor.` : 'El contenedor no tenía ítems cargados en esta orden.' });
};

/**
 * Pasa todo el material de una orden que ya está en un evento (o volviendo) directo a otra orden,
 * sin volver al depósito. La orden de origen queda cerrada como "desarmada" con el enlace al destino;
 * su historial de ítems se conserva.
 */
export const transferMaterial = async (req: Request, res: Response) => {
  const user = req.user!;
  const targetId = parseId(req.body.targetOrderId, 'orden de destino');

  const result = await sequelize.transaction(async (transaction) => {
    const source = await ServiceOrder.findOne({
      where: { id: parseId(req.params.id, 'id de la orden'), companyId: tenant(req) },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!source) throw new HttpError(404, 'Orden de servicio no encontrada.');
    if (!canTransfer(user, source)) {
      throw new HttpError(403, 'El material se puede pasar cuando la orden ya está en el evento o volviendo, y solo lo hace su responsable.');
    }
    if (targetId === source.id) throw new HttpError(400, 'Elegí otra orden de destino.');

    const target = await ServiceOrder.findOne({ where: { id: targetId, companyId: source.companyId }, lock: transaction.LOCK.UPDATE, transaction });
    if (!target) throw new HttpError(404, 'La orden de destino no existe.');
    if (target.status === ServiceOrderStatus.Disassembled) throw new HttpError(409, 'La orden de destino ya está desarmada.');
    // Quien pasa el material tiene que participar también de la orden que lo recibe.
    const targetPeople = [target.orderedBy, target.checkedBy, target.deployedBy, target.logisticsBy, target.receptionBy];
    if (!user.isAdmin && !canEditOrder(user, target) && !targetPeople.includes(user.id)) {
      throw new HttpError(403, 'Solo podés pasar el material a una orden en la que también seas responsable.');
    }

    const [items, stored] = await Promise.all([
      ServiceOrderItem.findAll({ where: { serviceOrderId: source.id }, transaction }),
      ServiceOrderStoreItem.findAll({ where: { serviceOrderId: source.id }, transaction }),
    ]);
    const already = new Set(
      (await ServiceOrderItem.findAll({ where: { serviceOrderId: target.id }, attributes: ['itemId'], transaction })).map((r) => r.itemId),
    );

    const newItems = items.filter((r) => !already.has(r.itemId));
    await ServiceOrderItem.bulkCreate(newItems.map((r) => ({ serviceOrderId: target.id, itemId: r.itemId })), { transaction });
    await ServiceOrderStoreItem.bulkCreate(
      stored.map((s) => ({ serviceOrderId: target.id, itemIdParent: s.itemIdParent, itemIdChild: s.itemIdChild })),
      { transaction, ignoreDuplicates: true },
    );

    // El origen se cierra: sus ítems ya están ocupados por el destino.
    await source.update({ status: ServiceOrderStatus.Disassembled, transferredToId: target.id }, { transaction });
    await ServiceOrderItem.update({ isActive: false }, { where: { serviceOrderId: source.id }, transaction });
    await ServiceOrderStoreItem.update({ isActive: false }, { where: { serviceOrderId: source.id }, transaction });

    return { moved: newItems.length, stored: stored.length, targetId: target.id };
  });

  res.json({
    message: `Se pasaron ${result.moved} ítem(s)${result.stored ? ` y ${result.stored} guardado(s) en contenedores` : ''} a la orden #${result.targetId}.`,
    ...result,
  });
};
