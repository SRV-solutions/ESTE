import { Request, Response } from 'express';
import ServiceOrder from '../models/ServiceOrder';
import ServiceOrderItem from '../models/ServiceOrderItem';
import Item from '../models/Item';

export const createServiceOrderItem = async (req: Request, res: Response) => {
  const { serviceOrderId, itemId, quantity } = req.body;
  try {
    const searchedServiceOrder = await ServiceOrder.findByPk(serviceOrderId)
    const searchedItem = await Item.findByPk(itemId)
    if (!searchedServiceOrder) {
      res.status(404).json({ message: 'La orden de servicio no existe' });
      return
    }
    if (!searchedItem) {
      res.status(404).json({ message: 'El item no existe' });
      return
    }
    if (!quantity || isNaN(quantity)) {
      res.status(404).json({ message: 'error en la cantidad ingresada' });
      return
    }
    if (searchedItem.quantity < quantity) {
      res.status(404).json({ message: 'No hay items suficiente' });
      return
    }
    const newServiceOrderItem = await ServiceOrderItem.create({
      serviceOrderId: searchedServiceOrder.id,
      itemId: searchedItem.id,
      quantity: quantity
    })
    res.status(201).json(newServiceOrderItem);
  } catch (error) {
    res.status(500).json({ message: 'Error creating role', error });
  }
};
