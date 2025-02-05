import { Request, Response } from 'express';
import { Model, Op } from 'sequelize';

import Category from '../models/Category';
import Item from '../models/Item';
import User from '../models/User';
import StoreItem from '../models/StoreItem';
import ServiceOrderItem from '../models/ServiceOrderItem';
import ServiceOrder, { ServiceOrderStatus } from '../models/ServiceOrder';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';

export const getItems = async (req: Request, res: any) => {
  try {
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

    const filteredItemsWithChildren = itemsWithChildren.filter(item => {
      if (item.StoreItemParent.length !== 0) {
        return item
      }
    })
    const childItemIds = filteredItemsWithChildren.flatMap((item: any) => {
      const parentId = item.id;
      const childIds = item.StoreItemParent.map((storeItem: any) => storeItem.StoreItemChild.id);

      return [parentId, ...childIds];
    });

    const itemsWithoutChildren = await Item.findAll({
      where: {
        id: { [Op.notIn]: childItemIds },
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
    code,
    weight,
    isStorable,
    isContainer,
  } = req.body;

  try {
    const searchedUserOwner = await User.findByPk(ownerId);
    if (!searchedUserOwner) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    let finalCategoryId = categoryId;

    if (!categoryId) {
      if (!name || !type || !unity || value === undefined || weight === undefined || isStorable === undefined || isContainer === undefined) {
        return res.status(400).json({ message: 'Faltan datos obligatorios para crear una categoría.' });
      }

      const newCategory = await Category.create({
        name,
        description,
        code,
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
    return res.status(500).json({ message: 'Error interno del servidor', error });
  }
};

export const deleteItem = async (req: Request, res: any) => {
  const { id } = req.params;

  try {
    const item = await Item.findByPk(id);

    if (!item) {
      return res.status(404).json({ message: 'Ítem no encontrado' });
    }

    await item.destroy();
    return res.json({ message: 'Ítem eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando el ítem', error });
  }
};

export const getAvalibleItemsByCategory = async (req: Request, res: any) => {
  const { categoryId } = req.body
  const items = await Item.findAll({
    include: [
      {
        model: ServiceOrderItem,
        required: false, // LEFT OUTER JOIN para incluir también los que no tienen órdenes
        include: [
          {
            model: ServiceOrder,
            required: false, // LEFT OUTER JOIN en ServiceOrder
            where: {
              status: { [Op.ne]: ServiceOrderStatus.Disassembled },
            },
          },
        ],
      },
      Category
    ],
    where: {
      // Filtra los items que no tienen órdenes activas
      '$ServiceOrderItems.ServiceOrder.id$': null,
      categoryId
    },
  });
  
  return res.status(201).json(items);
}

export const getAvalibleItems = async (req: Request, res: any) => {
  try {
    const items = await Item.findAll({
      include: [
        {
          model: ServiceOrderItem,
          required: false, // LEFT OUTER JOIN para incluir también los que no tienen órdenes
          include: [
            {
              model: ServiceOrder,
              required: false, // LEFT OUTER JOIN en ServiceOrder
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled }, // Solo ordenes que no están desarmadas
              },
            },
          ],
        },
        {
          model: ServiceOrderStoreItem,
          required: false, // LEFT OUTER JOIN para verificar si está en algún ServiceOrderStoreItem
          as: 'ServiceOrderStoreItemParent', // Usamos el alias para la relación 'itemIdParent'
          include: [
            {
              model: ServiceOrder,
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled }, // Asegura que esté en una orden no desarmada
              },
            },
          ],
        },
        {
          model: ServiceOrderStoreItem,
          required: false, // LEFT OUTER JOIN para verificar si está en algún ServiceOrderStoreItem
          as: 'ServiceOrderStoreItemChild', // Usamos el alias para la relación 'itemIdChild'
          include: [
            {
              model: ServiceOrder,
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled }, // Asegura que esté en una orden no desarmada
              },
            },
          ],
        },
        Category,
      ],
      where: {
        // Filtra los items que no están en ninguna orden de servicio activa
        '$ServiceOrderItems.ServiceOrder.id$': null,
        // Filtra los ítems que no están dentro de ningún baúl que esté relacionado con una orden de servicio no desarmada
        '$ServiceOrderStoreItemParent.id$': null,
        '$ServiceOrderStoreItemChild.id$': null,
      },
    });


    return res.status(200).json(items);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener los ítems disponibles.' });
  }
};
