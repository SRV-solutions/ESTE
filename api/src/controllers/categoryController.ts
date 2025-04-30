import { Request, Response } from 'express';

import Category from '../models/Category';
import Item from '../models/Item';

export const getCategories = async (req: Request, res: any) => {
  try {
    const categories = await Category.findAll({
      include: Item
    });
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
    // Buscar la categoría por su ID
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({ message: 'Categoría no encontrada' });
    }

    const statusIsActive = category.isActive; // El estado actual de la categoría
    category.isActive = !statusIsActive; // Cambiar el estado de la categoría

    // Guardar el nuevo estado de la categoría
    await category.save();  

    // Actualizar los ítems relacionados con esta categoría
    const [updatedRows] = await Item.update(
      { isActive: !statusIsActive },  // Cambiar el estado de los ítems
      { where: { categoryId: id } }  // Filtrar por categoría
    );    

    // Verificar si los ítems fueron actualizados
    if (updatedRows === 0) {
      return res.status(404).json({ message: 'No se encontraron ítems relacionados para actualizar.' });
    }

    return res.json({ message: 'Categoría e ítems desactivados con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error desactivando la categoría e ítems', error });
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
