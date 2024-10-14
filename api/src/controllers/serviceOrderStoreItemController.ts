import { Request, Response } from 'express';
import ServiceOrder from '../models/ServiceOrder';
import Item from '../models/Item';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';
import Category from '../models/Category';

export const createServiceOrderStoreItem = async (req: Request, res: Response) => {
  const { serviceOrderId, itemIdParent, itemIdChild } = req.body;
  try {
    const searchedServiceOrder = await ServiceOrder.findByPk(serviceOrderId)
    const searchedItemParent = await Item.findByPk(itemIdParent, {
      include: {
        model: Category
      }
    })
    const searchedItemChild = await Item.findByPk(itemIdChild, {
      include: {
        model: Category
      }
    })
    if (!searchedServiceOrder) {
      res.status(404).json({ message: 'La orden de servicio no existe' });
      return
    }
    if (!searchedItemParent || !searchedItemParent.isActive) {
      res.status(404).json({ message: 'El item almacenador no existe' });
      return
    }
    // if (!searchedItemParent.isContainer) {
    //   res.status(404).json({ message: 'Este item no puede almacenar otros items' });
    //   return
    // }
    if (!searchedItemChild || !searchedItemChild.isActive) {
      res.status(404).json({ message: 'El item a almacenar no existe' });
      return
    }
    // if (!searchedItemChild.isStorable) {
    //   res.status(404).json({ message: 'Este item no se puede almacenar' });
    //   return
    // }
    // if (!needed || isNaN(needed)) {
    //   res.status(404).json({ message: 'Error en la cantidad ingresada' });
    //   return
    // }
    // if (searchedItemChild.quantity < needed) {
    //   res.status(404).json({ message: 'No hay items suficientes del item a almacenar' });
    //   return
    // }    
    const newServiceOrderStoreItem = await ServiceOrderStoreItem.create({
      serviceOrderId,
      itemIdChild,
      itemIdParent
    })
    res.status(201).json(newServiceOrderStoreItem);
  } catch (error) {    
    res.status(500).json({ message: 'Error creating role', error });
  }
};
