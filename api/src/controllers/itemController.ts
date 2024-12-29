import { Request, Response } from 'express';
import { Op } from 'sequelize';

import Category from '../models/Category';
import Item from '../models/Item';
import User from '../models/User';
import StoreItem from '../models/StoreItem';

export const getItems = async (req: Request, res: any) => {
  try {
    // Consulta para obtener solo los items que tienen hijos almacenados dentro de ellos
    const itemsWithChildren = await Item.findAll({
      include: [
        {
          model: Category, // Incluyendo la categoría del item padre
          where: {
            isContainer: true
          }
        },
        {
          model: StoreItem,
          as: 'StoreItemParent', // Relación para items contenedores
          include: [
            {
              model: Item,
              as: 'StoreItemChild', // Items hijos (almacenados dentro del item padre)
              include: [
                {
                  model: Category, // Incluyendo la categoría del item hijo
                },
              ],
            },
          ],
        }
      ],
    });

    // Filtramos los items que son hijos para que no aparezcan en el listado general
    const filteredItemsWithChildren = itemsWithChildren.filter(item => {
      if (item.StoreItemParent.length !== 0) {
        return item
      }
    })
    const childItemIds = filteredItemsWithChildren.flatMap((item: any) => {
      const parentId = item.id; // ID del item padre
      const childIds = item.StoreItemParent.map((storeItem: any) => storeItem.StoreItemChild.id); // IDs de los items hijos

      return [parentId, ...childIds]; // Devuelve un array con el ID del padre y los hijos
    });

    const itemsWithoutChildren = await Item.findAll({
      where: {
        id: { [Op.notIn]: childItemIds }, // Excluir items que son hijos
      },
      include: [{ model: Category }],
    });

    return res.json([...filteredItemsWithChildren, ...itemsWithoutChildren]);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error });
  }
};

export const createItem = async (req: Request, res: any) => {
  const { 
    uses = 0, 
    ownerId = 1, 
    categoryId, 
    name, 
    description, 
    type, 
    quantity = 1, 
    unity, 
    value, 
    weight, 
    isStorable, 
    isContainer,
  } = req.body;

  try {
    // Validar existencia del usuario propietario
    const searchedUserOwner = await User.findByPk(ownerId);
    if (!searchedUserOwner) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    let finalCategoryId = categoryId;

    // Crear categoría si no se proporciona un categoryId
    if (!categoryId) {
      if (!name || !type || !unity || value === undefined || weight === undefined || isStorable === undefined || isContainer === undefined) {
        return res.status(400).json({ message: 'Faltan datos obligatorios para crear una categoría.' });
      }

      const newCategory = await Category.create({
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

      finalCategoryId = newCategory.id;
    } else {
      // Validar existencia de la categoría
      const category = await Category.findByPk(Number(categoryId));
      if (!category) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
    }

    // Crear ítems (bulk siempre, incluso si bulkQuantity es 1)
    const itemsToCreate = Array.from({ length: quantity }, () => ({
      isActive: true,
      uses,
      ownerId,
      categoryId: finalCategoryId
    }));

    await Item.bulkCreate(itemsToCreate);

    return res.status(201).json({ message: `${quantity} ítem(s) creado(s) con éxito` });
  } catch (error) {
    console.error('Error al crear ítem(s):', error);
    return res.status(500).json({ message: 'Error interno del servidor', error });
  }
};


