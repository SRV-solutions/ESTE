import { Request, Response } from 'express';
import ServiceOrder from '../models/ServiceOrder';
import Event from '../models/Event';
import User from '../models/User';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';
import Item from '../models/Item';

export const createServiceOrder = async (req: Request, res: Response) => {
  const { 
    eventId,
    createdDate,
    status,
    observations,
    checkedBy,
    orderBy,
    deployedBy,
    items
  } = req.body;

  try {
    const event = await Event.findByPk(eventId)
    if (!event) {
      res.status(404).json({ message: 'Event not not found' });
      return
    }
    const user = await User.findByPk(orderBy)
    if (!user) {
      res.status(404).json({ message: 'User not not found' });
      return
    }
    const serviceOrder: ServiceOrder = await ServiceOrder.create({
      eventId,
      createdDate,
      status,
      observations,
      checkedBy,
      orderBy,
      deployedBy  
    });
    if (items && items.length !== 0) {
      const searchedItems = await Item.findAll({
        where: {
          id: items.map((item:any) => item.id)
        }
      })
      console.log(searchedItems);
      
      // ServiceOrderStoreItem.bulkBuild
    }
    res.status(201).json(serviceOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating role', error });
  }
};
