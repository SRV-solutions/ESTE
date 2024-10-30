import { Request, Response } from 'express';
import { Op } from 'sequelize';

import ServiceOrder, { ServiceOrderStatus } from '../models/ServiceOrder';
import ServiceOrderItem from '../models/ServiceOrderItem';
import Item from '../models/Item';
import Category from '../models/Category';

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


export const createServiceOrderItems = async (req: Request, res: Response) => {
  const { serviceOrderId, categoryId, quantity } = req.body;

  try {
    const searchedServiceOrder = await ServiceOrder.findByPk(serviceOrderId);
    if (!searchedServiceOrder) {
      res.status(404).json({ message: 'La orden de servicio no existe' });
      return;
    }

    const searchedItems = await Item.findAll({
      include: {
        model: Category,
        where: { id: categoryId }
      }
    });

    if (searchedItems.length < quantity) {
      res.status(404).json({ message: 'No hay suficientes items disponibles en esta categoría' });
      return;
    }

    // Filtramos ítems ya asociados a órdenes de servicio activas
    const availableItems = [];
    for (const item of searchedItems) {
      const existingServiceOrderItem = await ServiceOrderItem.findOne({
        where: { itemId: item.id },
        include: {
          model: ServiceOrder,
          where: {
            status: {
              [Op.ne]: ServiceOrderStatus.Disassembled // Excluir el estado "Disassembled"
            }
          }
        }
      });

      if (!existingServiceOrderItem) {
        availableItems.push(item); // Sólo incluimos ítems que no están en órdenes activas
      }

      // Detenemos el ciclo si ya tenemos suficientes ítems
      if (availableItems.length === quantity) {
        break;
      }
    }

    if (availableItems.length < quantity) {
      res.status(404).json({ message: 'No hay suficientes items disponibles fuera de órdenes activas' });
      return;
    }

    // Preparamos los datos de los ítems a agregar
    const depuredItems = availableItems.slice(0, quantity).map(item => ({
      serviceOrderId: serviceOrderId,
      itemId: item.id
    }));

    const newServiceOrderItems = await ServiceOrderItem.bulkCreate(depuredItems);
    res.status(201).json(newServiceOrderItems);

  } catch (error) {
    res.status(500).json({ message: 'Error creando items en la orden de servicio', error });
  }
};

export const deleteServiceOrderItems = async (req: Request, res: any) => {
  const { serviceOrderId } = req.params;

  try {
    // Validación de `serviceOrderId`
    if (!serviceOrderId) {
      return res.status(400).json({ message: 'Debe seleccionar una orden de servicio válida' });
    }

    // Verifica si existen items con el `serviceOrderId` especificado
    const itemsToDelete = await ServiceOrderItem.findAll({ where: { serviceOrderId } });

    if (itemsToDelete.length === 0) {
      return res.status(404).json({ message: `No se encontraron items para la orden de servicio con ID ${serviceOrderId}` });
    }

    // Eliminación de los items
    await ServiceOrderItem.destroy({ where: { serviceOrderId } });
    res.status(200).json({ message: 'Items de la orden de servicio eliminados exitosamente' });
    
  } catch (error) {
    console.error('Error al eliminar items de la orden de servicio:', error);
    res.status(500).json({ message: 'Error al eliminar items de la orden de servicio', error });
  }
};

 
