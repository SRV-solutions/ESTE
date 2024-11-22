import { Request, Response } from 'express';
import { Op } from 'sequelize';

import Category from '../models/Category';
import Item from '../models/Item';
import StoreItem from '../models/StoreItem';

export const getItems = async (req: Request, res: any) => {
  try {
    // Consulta para obtener solo los items que tienen hijos almacenados dentro de ellos
    const itemsWithChildren = await Item.findAll({
      include: [
        {
          model: Category, // Incluyendo la categoría del item padre
          where:{
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
