import { Request, Response } from 'express';
import { literal } from 'sequelize';
import { sequelize } from '../config/database';
import { tenant } from '../middlewares/auth';
import { Category, Item } from '../models';
import { HttpError, parseId, pick } from '../utils/http';

const EDITABLE = ['code', 'name', 'description', 'type', 'unity', 'value', 'weight', 'isStorable', 'isContainer'] as const;

/** Normaliza y valida los datos de una categoría. `partial` permite omitir campos (edición). */
export const parseCategoryInput = (body: Record<string, unknown>, partial = false) => {
  const data = pick(body, EDITABLE);
  for (const key of ['code', 'name', 'description', 'type', 'unity'] as const) {
    if (data[key] !== undefined) data[key] = String(data[key] ?? '').trim();
  }
  for (const key of ['value', 'weight'] as const) {
    if (data[key] !== undefined) {
      const n = Number(data[key]);
      if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `El campo ${key === 'value' ? 'valor' : 'peso'} debe ser un número positivo.`);
      data[key] = n;
    }
  }
  for (const key of ['isStorable', 'isContainer'] as const) {
    if (data[key] !== undefined) data[key] = Boolean(data[key]);
  }
  // El código es el prefijo de cada ítem (`HDMI-12`): sin espacios para que se pueda escanear y buscar.
  if (data.code !== undefined && /\s/.test(String(data.code))) {
    throw new HttpError(400, 'El código de la categoría no puede tener espacios (ej: HDMI o BAUL-AZUL).');
  }

  const required = ['code', 'name', 'type', 'unity', 'value', 'weight'] as const;
  const missing = required.filter((k) => (partial ? data[k] === '' : data[k] === undefined || data[k] === ''));
  if (missing.length) throw new HttpError(400, `Faltan datos obligatorios: ${missing.join(', ')}.`);

  return data;
};

const ITEM_COUNT = literal('(SELECT COUNT(*) FROM "Item" i WHERE i."categoryId" = "Category"."id")::int');
const ACTIVE_ITEM_COUNT = literal(
  '(SELECT COUNT(*) FROM "Item" i WHERE i."categoryId" = "Category"."id" AND i."isActive" = true)::int',
);

export const listCategories = async (req: Request, res: Response) => {
  const categories = await Category.findAll({
    where: { companyId: tenant(req) },
    attributes: { include: [[ITEM_COUNT, 'itemCount'], [ACTIVE_ITEM_COUNT, 'activeItemCount']] },
    order: [['name', 'ASC']],
  });
  res.json(categories);
};

export const createCategory = async (req: Request, res: Response) => {
  const data = parseCategoryInput(req.body);
  const category = await Category.create({ isStorable: false, isContainer: false, ...data, companyId: tenant(req), isActive: true });
  res.status(201).json(category);
};

const findCategory = async (req: Request) => {
  const category = await Category.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) } });
  if (!category) throw new HttpError(404, 'Categoría no encontrada.');
  return category;
};

export const updateCategory = async (req: Request, res: Response) => {
  const category = await findCategory(req);
  await category.update(parseCategoryInput(req.body, true));
  res.json(category);
};

/** Activa/desactiva la categoría y todos sus ítems. No borra nada. */
export const toggleCategory = async (req: Request, res: Response) => {
  const category = await findCategory(req);

  const isActive = !category.isActive;
  await sequelize.transaction(async (transaction) => {
    await category.update({ isActive }, { transaction });
    await Item.update({ isActive }, { where: { categoryId: category.id }, transaction });
  });

  res.json({ message: isActive ? 'Categoría activada.' : 'Categoría desactivada.', category });
};
