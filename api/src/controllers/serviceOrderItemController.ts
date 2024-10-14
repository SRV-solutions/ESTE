import { Request, Response } from 'express';
import { Op } from 'sequelize';

import ServiceOrder, {ServiceOrderStatus} from '../models/ServiceOrder';
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

    // if (!needed || isNaN(needed)) {
    //   res.status(404).json({ message: 'error en la cantidad ingresada' });
    //   return
    // }    
    // const quantityItemsCategory = await Item.findAll({
    //   where: {
    //     categoryId: searchedItem.Category.id
    //   }
    // })    
    // if (quantityItemsCategory.length === 0) {
    //   res.status(404).json({ message: 'No hay items suficiente' });
    //   return
    // }
    
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
