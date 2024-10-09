import { Request, Response } from 'express';
import ServiceOrder from '../models/ServiceOrder';
import Item from '../models/Item';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';

export const createServiceOrderStoreItem = async (req: Request, res: Response) => {
  const { serviceOrderId, itemIdParent, itemIdChild, quantity } = req.body;
  try {
    const searchedServiceOrder = await ServiceOrder.findByPk(serviceOrderId)
    const searchedItemParent = await Item.findByPk(itemIdParent)
    const searchedItemChild = await Item.findByPk(itemIdChild)
    if (!searchedServiceOrder) {
      res.status(404).json({ message: 'La orden de servicio no existe' });
      return
    }
    if (!searchedItemParent || !searchedItemParent.isActive) {
      res.status(404).json({ message: 'El item almacenador no existe' });
      return
    }
    if (!searchedItemChild || !searchedItemChild.isActive) {
      res.status(404).json({ message: 'El item a almacenar no existe' });
      return
    }
    if (!quantity || isNaN(quantity)) {
      res.status(404).json({ message: 'Error en la cantidad ingresada' });
      return
    }
    if (searchedItemChild.quantity < quantity) {
      res.status(404).json({ message: 'No hay items suficientes del item a almacenar' });
      return
    }
    console.log(req.body);
    
    const newServiceOrderStoreItem = await ServiceOrderStoreItem.create({
      serviceOrderId,
      itemIdChild,
      itemIdParent,
      quantity
    })
    res.status(201).json(newServiceOrderStoreItem);
  } catch (error) {    
    res.status(500).json({ message: 'Error creating role', error });
  }
};
