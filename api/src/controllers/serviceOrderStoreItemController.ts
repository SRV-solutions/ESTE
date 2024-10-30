import { Request, Response } from 'express';
import { Op } from 'sequelize';

import ServiceOrder, { ServiceOrderStatus } from '../models/ServiceOrder';
import Item from '../models/Item';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';
import Category from '../models/Category';
import ServiceOrderItem from '../models/ServiceOrderItem';

export const createServiceOrderStoreItem = async (req: Request, res: any) => {
  const { serviceOrderId, itemIdParent, itemIdChild } = req.body;

  try {
    // Buscar la orden de servicio
    const searchedServiceOrder = await ServiceOrder.findByPk(serviceOrderId);
    if (!searchedServiceOrder) {
      return res.status(404).json({ message: 'La orden de servicio no existe' });
    }

    // Buscar el ítem contenedor (parent)
    const searchedItemParent = await Item.findByPk(itemIdParent, {
      include: { model: Category }
    });
    if (!searchedItemParent || !searchedItemParent.isActive) {
      return res.status(404).json({ message: 'El item almacenador no existe' });
    }
    if (!searchedItemParent.Category.isContainer) {
      return res.status(404).json({ message: 'Este item no puede almacenar otros items' });
    }

    // Buscar el ítem que se va a almacenar (child)
    const searchedItemChild = await Item.findByPk(itemIdChild, {
      include: { model: Category }
    });
    if (!searchedItemChild || !searchedItemChild.isActive) {
      return res.status(404).json({ message: 'El item a almacenar no existe' });
    }
    if (!searchedItemChild.Category.isStorable) {
      return res.status(404).json({ message: 'Este item no se puede almacenar' });
    }

    const searchedServiceOrderItemByServiceOrderId = await ServiceOrderItem.findOne({
      where:{
        serviceOrderId: serviceOrderId,
        itemId: searchedItemParent.id
      }
    })


    if (!searchedServiceOrderItemByServiceOrderId) {
      return res.status(404).json({ message: 'El item padre no se encuenta en la orden de servicio, agregue el item antes de cargar mas items' });
    }

    // Verificar si el itemIdChild ya está almacenado en otro ítem dentro de una orden de servicio que no esté en estado 'Disassembled'
    const existingServiceOrderStoreItem = await ServiceOrderStoreItem.findOne({
      where: {
        itemIdChild: itemIdChild
      },
      include: {
        model: ServiceOrder,
        where: {
          // Asegurar que la orden de servicio no esté en estado 'Disassembled'
          status: {
            [Op.ne]: 'Disassembled'
          }
        }
      }
    });

    // Si el ítem ya está almacenado en otra orden de servicio que no sea 'Disassembled', se rechaza la creación
    if (existingServiceOrderStoreItem) {
      return res.status(400).json({
        message: 'Este item ya está almacenado en una orden de servicio activa.'
      });
    }

    // Verificar si el item ya está almacenado en el mismo parent
    const searchedServiceOrderItem = await ServiceOrderStoreItem.findOne({
      where: {
        itemIdParent: searchedItemParent.id,
        itemIdChild: searchedItemChild.id
      }
    });

    if (searchedServiceOrderItem) {
      return res.status(404).json({ message: 'Este item ya se encuentra almacenado en este ítem' });
    }

    // Crear la relación ServiceOrderStoreItem
    const newServiceOrderStoreItem = await ServiceOrderStoreItem.create({
      serviceOrderId,
      itemIdParent,
      itemIdChild
    });

    // Retornar el nuevo ServiceOrderStoreItem creado
    return res.status(201).json(newServiceOrderStoreItem);

  } catch (error) {
    console.error('Error creating ServiceOrderStoreItem:', error);
    return res.status(500).json({ message: 'Error creating ServiceOrderStoreItem', error });
  }
};

export const createServiceOrderStoreItems = async (req: Request, res: Response) => {
  const { serviceOrderId, itemIdParent, categoryId, quantity } = req.body;

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

  } catch (error) {
    res.status(500).json({ message: 'Error creando items en la orden de servicio', error });
  }
};