import { Request, Response } from 'express';
import { tenant } from '../middlewares/auth';
import { StoreItem } from '../models';
import { findAvailableItems, findCompanyItem, getBusyItemIds } from '../services/itemService';
import { HttpError, parseId } from '../utils/http';

/** El contenido fijo solo se cambia con el contenedor en el depósito (no en una orden activa). */
const findIdleContainer = async (companyId: number, id: number) => {
  const container = await findCompanyItem(companyId, id);
  if (!container.Category?.isContainer) throw new HttpError(400, 'Ese ítem no es un contenedor.');
  if ((await getBusyItemIds(companyId)).has(id)) {
    throw new HttpError(409, 'El contenedor está en una orden activa: cambiá su contenido cuando vuelva al depósito.');
  }
  return container;
};

/** Asigna contenido fijo a un contenedor (los hijos viajan siempre dentro de él). */
export const assignToContainer = async (req: Request, res: Response) => {
  const companyId = tenant(req);
  const parentId = parseId(req.body.itemIdParent, 'contenedor');
  const childIds: number[] = Array.isArray(req.body.itemIdsChild) ? req.body.itemIdsChild.map((id: unknown) => parseId(id)) : [];
  if (!childIds.length) throw new HttpError(400, 'Elegí al menos un ítem para guardar.');
  if (childIds.includes(parentId)) throw new HttpError(400, 'Un contenedor no puede guardarse a sí mismo.');

  const parent = await findIdleContainer(companyId, parentId);
  const available = new Set(
    (await findAvailableItems(companyId, { storableOnly: true, excludePermanentParents: true })).map((i) => i.id),
  );
  if (childIds.some((id) => !available.has(id))) {
    throw new HttpError(409, 'Algunos ítems ya están en uso, dentro de otro contenedor o no son almacenables.');
  }

  await StoreItem.bulkCreate(childIds.map((itemIdChild) => ({ itemIdParent: parentId, itemIdChild })));
  res.status(201).json({ message: `${childIds.length} ítem(s) guardado(s) en ${parent.code}.` });
};

export const removeFromContainer = async (req: Request, res: Response) => {
  const parentId = parseId(req.params.parentId);
  await findIdleContainer(tenant(req), parentId);
  const deleted = await StoreItem.destroy({ where: { itemIdParent: parentId, itemIdChild: parseId(req.params.childId) } });
  if (!deleted) throw new HttpError(404, 'Ese ítem no está guardado en el contenedor.');
  res.json({ message: 'Ítem quitado del contenedor.' });
};

/** Vacía el contenedor: todo su contenido fijo queda suelto en el depósito. */
export const emptyContainer = async (req: Request, res: Response) => {
  const parent = await findIdleContainer(tenant(req), parseId(req.params.parentId));
  const deleted = await StoreItem.destroy({ where: { itemIdParent: parent.id } });
  res.json({ message: deleted ? `${parent.code} quedó vacío: ${deleted} ítem(s) volvieron al depósito.` : `${parent.code} ya estaba vacío.` });
};
