import csvParser from 'csv-parser';
import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { Readable } from 'stream';
import { sequelize } from '../config/database';
import { tenant } from '../middlewares/auth';
import { Category, Item, StoreItem, User } from '../models';
import { createItemsForCategory, findAvailableItems, findCompanyItem } from '../services/itemService';
import { HttpError, parseId, parsePositiveInt } from '../utils/http';
import { naturalCodeOrder } from '../utils/itemCode';
import { parseCategoryInput } from '../utils/categoryInput';

const MAX_PAGE_SIZE = 100;
const MAX_PER_BATCH = 1000;

/**
 * Stock paginado. Los ítems guardados fijos dentro de un contenedor no se listan sueltos:
 * aparecen en `contents` de su contenedor.
 */
export const listItems = async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), MAX_PAGE_SIZE);
  const search = String(req.query.search || '').trim();
  const categoryId = Number(req.query.category) || undefined;

  const where: WhereOptions = {
    companyId: tenant(req),
    id: { [Op.notIn]: sequelize.literal('(SELECT "itemIdChild" FROM "StoreItem")') },
    ...(categoryId ? { categoryId } : {}),
    ...(search
      ? { [Op.or]: [{ code: { [Op.iLike]: `%${search}%` } }, { '$Category.name$': { [Op.iLike]: `%${search}%` } }] }
      : {}),
  };

  const { rows, count } = await Item.findAndCountAll({
    where,
    include: [
      { model: Category, required: true },
      { model: User, as: 'Owner', attributes: ['id', 'username', 'firstname', 'lastname'] },
    ],
    order: naturalCodeOrder(),
    limit,
    offset: (page - 1) * limit,
  });

  const containerIds = rows.filter((i) => i.Category?.isContainer).map((i) => i.id);
  const contents = containerIds.length
    ? await StoreItem.findAll({ where: { itemIdParent: containerIds }, include: [{ model: Item, as: 'Child', include: [Category] }] })
    : [];

  const items = rows.map((item) => ({
    ...item.toJSON(),
    contents: contents.filter((c) => c.itemIdParent === item.id).map((c) => c.Child),
  }));

  res.json({ totalItems: count, totalPages: Math.max(Math.ceil(count / limit), 1), currentPage: page, items });
};

/** Ítems libres para cargar en una orden (opcionalmente de una categoría o solo almacenables). */
export const listAvailableItems = async (req: Request, res: Response) => {
  const categoryId = Number(req.query.category) || undefined;
  res.json(await findAvailableItems(tenant(req), { categoryId, storableOnly: req.query.storable === 'true' }));
};

/** Cuántos ítems libres hay por categoría (para elegir qué cargar sin bajar miles de ítems). */
export const listAvailableSummary = async (req: Request, res: Response) => {
  const items = await findAvailableItems(tenant(req), { storableOnly: req.query.storable === 'true' });
  const byCategory = new Map<number, { category: Category; count: number }>();
  for (const item of items) {
    const entry = byCategory.get(item.categoryId) ?? { category: item.Category!, count: 0 };
    entry.count++;
    byCategory.set(item.categoryId, entry);
  }
  res.json([...byCategory.values()].sort((a, b) => a.category.name.localeCompare(b.category.name, 'es')));
};

/** Ítems almacenables libres para asignar como contenido fijo de un contenedor. */
export const listAvailableStorableItems = async (req: Request, res: Response) => {
  res.json(await findAvailableItems(tenant(req), { storableOnly: true, excludePermanentParents: true }));
};

/** Crea N ítems en una categoría existente, o crea la categoría y sus ítems en un paso. */
export const createItems = async (req: Request, res: Response) => {
  const companyId = tenant(req);
  const quantity = parsePositiveInt(req.body.quantity ?? 1, 'La cantidad', MAX_PER_BATCH);
  const uses = Math.max(Number(req.body.uses) || 0, 0);

  const created = await sequelize.transaction(async (transaction) => {
    let category: Category | null;
    if (req.body.categoryId) {
      category = await Category.findOne({ where: { id: parseId(req.body.categoryId, 'id de categoría'), companyId }, transaction });
      if (!category) throw new HttpError(404, 'Categoría no encontrada.');
      if (!category.isActive) throw new HttpError(409, 'La categoría está desactivada.');
    } else {
      const data = parseCategoryInput(req.body);
      category = await Category.create({ isStorable: false, isContainer: false, ...data, companyId, isActive: true }, { transaction });
    }
    return createItemsForCategory(category, quantity, { uses, ownerId: req.user!.id }, transaction);
  });

  res.status(201).json({ message: `${created.length} ítem(s) creado(s).`, items: created });
};

export const updateItem = async (req: Request, res: Response) => {
  const item = await findCompanyItem(tenant(req), parseId(req.params.id));

  const updates: Record<string, unknown> = {};
  if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
  if (req.body.uses !== undefined) {
    const uses = Number(req.body.uses);
    if (!Number.isInteger(uses) || uses < 0) throw new HttpError(400, 'Los usos deben ser un número entero positivo.');
    updates.uses = uses;
  }
  if (req.body.code !== undefined) {
    const code = String(req.body.code).trim();
    if (!code || /\s/.test(code)) throw new HttpError(400, 'El código no puede estar vacío ni tener espacios.');
    updates.code = code;
  }

  await item.update(updates);
  res.json(item);
};

export const deleteItem = async (req: Request, res: Response) => {
  const item = await findCompanyItem(tenant(req), parseId(req.params.id));
  await item.destroy(); // Si tiene historial en órdenes, el errorHandler responde 409.
  res.json({ message: 'Ítem eliminado.' });
};

// ---------- Importación CSV ----------

const CSV_HEADERS = ['nombre', 'descripcion', 'codigo', 'tipo', 'unidad', 'valor', 'peso', 'es_almacenable', 'es_contenedor', 'cantidad'] as const;

const YES = new Set(['si', 'sí', 's', 'true', '1', 'x', 'yes']);

/**
 * Excel en Windows guarda los CSV en Windows-1252: leerlos como UTF-8 convierte "á" o "ñ" en "�".
 * Si el archivo no es UTF-8 válido, se decodifica como Windows-1252.
 */
export const decodeCsv = (buffer: Buffer) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
};

/** Normaliza encabezados: minúsculas, sin tildes ni espacios ("Descripción" → "descripcion"). */
const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_');

const parseCsv = (buffer: Buffer) =>
  new Promise<Record<string, string>[]>((resolve, reject) => {
    const text = decodeCsv(buffer);
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    // Excel en español exporta con `;`.
    const separator = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
    const rows: Record<string, string>[] = [];

    Readable.from([text])
      .pipe(csvParser({ separator, mapHeaders: ({ header }) => normalizeHeader(header) }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

/** Números con coma decimal ("15,5") o punto ("15.5"). */
const parseNumber = (value: string | undefined) => (value ? Number(value.trim().replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')) : NaN);

export const importItemsCsv = async (req: Request, res: Response) => {
  if (!req.file) throw new HttpError(400, 'Adjuntá un archivo CSV.');
  const companyId = tenant(req);

  const rows = await parseCsv(req.file.buffer);
  if (!rows.length) throw new HttpError(400, 'El archivo no tiene filas.');

  const headers = Object.keys(rows[0]);
  const missing = CSV_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) throw new HttpError(400, `Faltan columnas obligatorias: ${missing.join(', ')}.`);

  // Validar todo antes de escribir: o se importa el archivo entero o nada.
  const errors: string[] = [];
  const parsed = rows.map((row, i) => {
    const line = i + 2;
    const quantity = Number(row.cantidad);
    if (!row.codigo?.trim()) errors.push(`Fila ${line}: falta el código.`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_PER_BATCH) {
      errors.push(`Fila ${line}: la cantidad debe ser un entero entre 1 y ${MAX_PER_BATCH}.`);
    }
    return { line, row, quantity, uses: Math.max(Number(row.usos) || 0, 0) };
  });
  if (errors.length) throw new HttpError(400, errors.slice(0, 10).join(' '), errors);

  const summary = await sequelize.transaction(async (transaction) => {
    let itemsCreated = 0;
    let categoriesCreated = 0;
    // Secuencial a propósito: dos filas con el mismo código comparten la categoría recién creada.
    for (const { line, row, quantity, uses } of parsed) {
      const code = row.codigo.trim();
      let category = await Category.findOne({ where: { code, companyId }, transaction });
      if (!category) {
        let data;
        try {
          data = parseCategoryInput({
            code,
            name: row.nombre,
            description: row.descripcion,
            type: row.tipo,
            unity: row.unidad,
            value: parseNumber(row.valor),
            weight: parseNumber(row.peso),
            isStorable: YES.has(String(row.es_almacenable).trim().toLowerCase()),
            isContainer: YES.has(String(row.es_contenedor).trim().toLowerCase()),
          });
        } catch (err) {
          throw new HttpError(400, `Fila ${line}: ${(err as Error).message}`);
        }
        category = await Category.create({ ...data, companyId, isActive: true }, { transaction });
        categoriesCreated++;
      }
      const created = await createItemsForCategory(category, quantity, { uses, ownerId: req.user!.id }, transaction);
      itemsCreated += created.length;
    }
    return { itemsCreated, categoriesCreated };
  });

  res.status(201).json({
    message: `Importación completa: ${summary.itemsCreated} ítem(s) y ${summary.categoriesCreated} categoría(s) nueva(s).`,
    ...summary,
  });
};
