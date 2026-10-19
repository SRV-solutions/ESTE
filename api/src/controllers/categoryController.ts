import { Request, Response } from 'express';
import { literal } from 'sequelize';
import { sequelize } from '../config/database';
import { tenant } from '../middlewares/auth';
import { Category, Item } from '../models';
import { parseCategoryInput } from '../utils/categoryInput';
import { HttpError, parseId } from '../utils/http';

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
