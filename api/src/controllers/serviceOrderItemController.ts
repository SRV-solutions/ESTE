import { Request, Response } from 'express';
import { Op } from 'sequelize';

import ServiceOrder, { ServiceOrderStatus } from '../models/ServiceOrder';
import ServiceOrderItem from '../models/ServiceOrderItem';
import Item from '../models/Item';
import Category from '../models/Category';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';

export const createServiceOrderItem = async (req: Request, res: Response) => {
  const { serviceOrderId, itemId } = req.body;
  try {
    const searchedServiceOrder = await ServiceOrder.findByPk(serviceOrderId)
    const searchedItem = await Item.findByPk(itemId, {
      include: {
        model: Category
      }
    })
    if (!searchedServiceOrder) {
      res.status(404).json({ message: 'La orden de servicio no existe' });
      return
    }
    if (!searchedItem || !searchedItem.isActive) {
      res.status(404).json({ message: 'El item no existe' });
      return
    }

    const searchedServiceOrderItemByItem = await ServiceOrderItem.findOne({
      where: {
        itemId: itemId
      },
      include: {
        model: ServiceOrder,
        where: {
          status: {
            [Op.ne]: ServiceOrderStatus.Disassembled // Excluir el estado "Disassembled"
          }
        }
      }
    });

    if (searchedServiceOrderItemByItem) {
      res.status(404).json({ message: 'Ese item ya se encuentra en una orden de servicio' });
      return
    }
    const searchedServiceOrderItemByItemAndServiceOrder = await ServiceOrderItem.findOne({
      where: {
        serviceOrderId: serviceOrderId,
        itemId: itemId
      }
    })
    if (searchedServiceOrderItemByItemAndServiceOrder) {
      res.status(404).json({ message: 'Ese item ya se encuentra en la orden de servicio' });
      return
    }
    const newServiceOrderItem = await ServiceOrderItem.create({
      serviceOrderId: searchedServiceOrder.id,
      itemId: searchedItem.id
    })
    res.status(201).json(newServiceOrderItem);
  } catch (error) {
    res.status(500).json({ message: 'Error creating role', error });
  }
};

export const createServiceOrderItems = async (req: Request, res: any) => {
  const { serviceOrderId, categoryId, quantity } = req.body;

  try {
    // Verificar si la orden de servicio existe
    const searchedServiceOrder = await ServiceOrder.findByPk(serviceOrderId);
    if (!searchedServiceOrder) {
      return res.status(404).json({ message: 'La orden de servicio no existe' });
    }

    // Obtener ítems de la categoría específica
    const searchedItems = await Item.findAll({
      include: {
        model: Category,
        where: { id: categoryId },
      },
    });

    if (searchedItems.length < quantity) {
      return res.status(404).json({ message: 'No hay suficientes ítems disponibles en esta categoría' });
    }

    // Obtener IDs de ítems ya asociados a órdenes activas o almacenados
    const activeItemIds = new Set(
      await ServiceOrderItem.findAll({
        attributes: ['itemId'],
        include: {
          model: ServiceOrder,
          where: {
            status: { [Op.ne]: ServiceOrderStatus.Disassembled },
          },
        },
      }).then((items) => items.map((item) => item.itemId))
    );

    const storedItemIds = new Set(
      await ServiceOrderStoreItem.findAll({
        attributes: ['itemIdChild'],
      }).then((items) => items.map((item) => item.itemIdChild))
    );

    // Filtrar ítems disponibles
    const availableItems = searchedItems.filter(
      (item) => !activeItemIds.has(item.id) && !storedItemIds.has(item.id)
    );

    if (availableItems.length < quantity) {
      return res.status(404).json({ message: 'No hay suficientes ítems disponibles fuera de órdenes activas' });
    }

    // Crear ítems seleccionados
    const depuredItems = availableItems.slice(0, quantity).map((item) => ({
      serviceOrderId,
      itemId: item.id,
    }));

    const newServiceOrderItems = await ServiceOrderItem.bulkCreate(depuredItems);

    res.status(201).json({ message: 'Ítems creados exitosamente', data: newServiceOrderItems });
  } catch (error) {
    console.error('Error al crear ítems en la orden de servicio:', error);
    res.status(500).json({ message: 'Error creando ítems en la orden de servicio', error });
  }
};

export const deleteServiceOrderItems = async (req: Request, res: any) => {
  const { serviceOrderId } = req.params;

  try {
    if (!serviceOrderId) {
      return res.status(400).json({ message: 'Debe seleccionar una orden de servicio válida.' });
    }

    const itemsToDelete = await ServiceOrderItem.findAll({ where: { serviceOrderId } });

    if (itemsToDelete.length === 0) {
      return res.status(404).json({ message: `No se encontraron items para la orden de servicio con ID ${serviceOrderId}.` });
    }

    const items2delete = itemsToDelete.map(item => item.itemId);

    const containerItems = await Item.findAll({
      where: { id: items2delete },
      include: [
        {
          model: Category,
          where: { isContainer: true }, 
        },
      ],
    });

    const containerItemIds = containerItems.map(item => item.id);

    const deletedContainers = await ServiceOrderStoreItem.destroy({
      where: {
        itemIdParent: containerItemIds,
        serviceOrderId,
      },
    });


    const deletedItems = await ServiceOrderItem.destroy({
      where: { serviceOrderId },
    });

    return res.status(200).json({
      message: 'Items de la orden de servicio eliminados exitosamente.',
      deletedContainers,
      deletedItems,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar items de la orden de servicio.',
      error: error,
    });
  }
};


export const deleteServiceOrderItem = async (req: Request, res: any) => {
  const { serviceOrderId, itemId } = req.params;

  try {
    if (!serviceOrderId) {
      return res.status(400).json({ message: 'Debe seleccionar una orden de servicio válida' });
    }
    const itemsToDelete = await ServiceOrderItem.findAll({ where: { serviceOrderId } });

    if (itemsToDelete.length === 0) {
      return res.status(404).json({ message: `No se encontraron items para la orden de servicio con ID ${serviceOrderId}` });
    }

    const itemToDeleteExist = itemsToDelete.some(item => (item.itemId === Number(itemId)))
    
    if (!itemToDeleteExist) {
      return res.status(404).json({ message: `El item no se encuentra en la orden de servicio ${serviceOrderId}` });

    }
    await ServiceOrderItem.destroy({
      where: {
        serviceOrderId,
        itemId
      }
    });

    res.status(200).json({ message: 'Item de la orden de servicio eliminados exitosamente' });

  } catch (error) {
    console.error('Error al eliminar item de la orden de servicio:', error);
    res.status(500).json({ message: 'Error al eliminar item de la orden de servicio', error });
  }
}