import { Op, QueryTypes, Transaction, WhereOptions } from 'sequelize';
import { sequelize } from '../config/database';
import { Category, Item, StoreItem } from '../models';
import { ServiceOrderStatus } from '../models/enums';
import { HttpError } from '../utils/http';
import { naturalCodeOrder } from '../utils/itemCode';

/**
 * Ítems ocupados de una empresa: cargados en una orden que todavía no se desarmó, guardados
 * en un contenedor de una orden activa, o guardados fijos dentro de un contenedor ocupado
 * (a cualquier profundidad: un baúl dentro de otro baúl también viaja).
 */
export const getBusyItemIds = async (companyId: number, transaction?: Transaction): Promise<Set<number>> => {
  const rows = await sequelize.query<{ id: number }>(
    `SELECT soi."itemId" AS id
       FROM "ServiceOrderItem" soi JOIN "ServiceOrder" so ON so.id = soi."serviceOrderId"
      WHERE so."companyId" = :companyId AND so.status <> :done
     UNION
     SELECT sosi."itemIdChild"
       FROM "ServiceOrderStoreItem" sosi JOIN "ServiceOrder" so ON so.id = sosi."serviceOrderId"
      WHERE so."companyId" = :companyId AND so.status <> :done`,
    { replacements: { companyId, done: ServiceOrderStatus.Disassembled }, type: QueryTypes.SELECT, transaction },
  );
  const busy = new Set(rows.map((r) => r.id));

  let frontier = [...busy];
  while (frontier.length) {
    const children = await StoreItem.findAll({ attributes: ['itemIdChild'], where: { itemIdParent: frontier }, raw: true, transaction });
    frontier = children.map((c) => c.itemIdChild).filter((id) => !busy.has(id));
    frontier.forEach((id) => busy.add(id));
  }
  return busy;
};

const PERMANENT_CHILD_IDS = '(SELECT "itemIdChild" FROM "StoreItem")';
const PERMANENT_PARENT_IDS = '(SELECT "itemIdParent" FROM "StoreItem")';

interface AvailableOptions {
  categoryId?: number;
  storableOnly?: boolean;
  /** Excluye contenedores que ya tienen contenido fijo (para asignar contenido fijo nuevo). */
  excludePermanentParents?: boolean;
  transaction?: Transaction;
}

/** Ítems activos, de categorías activas, que no están en uso ni guardados fijos dentro de un contenedor. */
export const findAvailableItems = async (companyId: number, opts: AvailableOptions = {}) => {
  const busy = await getBusyItemIds(companyId, opts.transaction);
  const idFilters: WhereOptions[] = [{ id: { [Op.notIn]: sequelize.literal(PERMANENT_CHILD_IDS) } }];
  if (busy.size) idFilters.push({ id: { [Op.notIn]: [...busy] } });
  if (opts.excludePermanentParents) idFilters.push({ id: { [Op.notIn]: sequelize.literal(PERMANENT_PARENT_IDS) } });

  return Item.findAll({
    where: {
      companyId,
      isActive: true,
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      [Op.and]: idFilters,
    },
    include: [
      {
        model: Category,
        required: true,
        where: { isActive: true, ...(opts.storableOnly ? { isStorable: true } : {}) },
      },
    ],
    order: naturalCodeOrder(),
    transaction: opts.transaction,
  });
};

/** Toma `quantity` ítems libres de una categoría o falla con un mensaje claro. */
export const pickAvailableItems = async (
  companyId: number,
  categoryId: number,
  quantity: number,
  opts: { storableOnly?: boolean; transaction?: Transaction } = {},
) => {
  const available = await findAvailableItems(companyId, { categoryId, ...opts });
  if (available.length < quantity) {
    throw new HttpError(409, `Solo hay ${available.length} ítem(s) disponible(s) en esta categoría y pediste ${quantity}.`);
  }
  return available.slice(0, quantity);
};

/**
 * Crea `quantity` ítems de una categoría con códigos correlativos (`CAT-1`, `CAT-2`…).
 * Bloquea la fila de la categoría para que dos cargas simultáneas no repitan números.
 */
export const createItemsForCategory = async (
  category: Category,
  quantity: number,
  data: { uses?: number; ownerId: number },
  transaction: Transaction,
) => {
  await Category.findByPk(category.id, { lock: transaction.LOCK.UPDATE, transaction });

  const [row] = await sequelize.query<{ last: number | null }>(
    `SELECT MAX(NULLIF(substring("code" from '-([0-9]+)$'), '')::int) AS last FROM "Item" WHERE "categoryId" = :categoryId`,
    { replacements: { categoryId: category.id }, type: QueryTypes.SELECT, transaction },
  );
  const start = (row?.last || 0) + 1;

  const rows = Array.from({ length: quantity }, (_, i) => ({
    companyId: category.companyId,
    code: `${category.code}-${start + i}`,
    isActive: true,
    uses: data.uses ?? 0,
    ownerId: data.ownerId,
    categoryId: category.id,
  }));
  return Item.bulkCreate(rows, { transaction });
};

/** Busca un ítem de la empresa o devuelve 404 (nunca deja tocar ítems de otra empresa). */
export const findCompanyItem = async (companyId: number, id: number, transaction?: Transaction) => {
  const item = await Item.findOne({ where: { id, companyId }, include: [Category], transaction });
  if (!item) throw new HttpError(404, 'Ítem no encontrado.');
  return item;
};
