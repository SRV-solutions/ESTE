import { Request, Response } from 'express';

import Category from '../models/Category';

export const getCategories = async (req: Request, res: any) => {
  try {
    const categories = await Category.findAll();
    return res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error });
  }
};

export const createCategory = async (req: Request, res: any) => {
  try {
    
    const { code, name, description, type, unity, value, weight, isStorable = false, isContainer = false, isActive } = req.body;

    if (!code || !name || !type || !unity || value == null || weight == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const category = await Category.create({
      code,
      name,
      description,
      type,
      unity,
      value,
      weight,
      isStorable,
      isContainer,
      isActive: true,
    });

    return res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error });
  }
};

export const deleteCategory = async (req: Request, res: any) => {
  const { id } = req.params;

  try {
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    await category.destroy();
    return res.json({ message: 'Categoría eliminada con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando la categoría', error });
  }
};

export const updateCategory = async (req: Request, res: any) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    await category.update(updateData);

    return res.json({ message: 'Categoría actualizada con éxito', category });
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando la categoría', error });
  }
};
