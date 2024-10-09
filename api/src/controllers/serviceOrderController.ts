import { Request, Response } from 'express';
import ServiceOrder from '../models/ServiceOrder';
import Event from '../models/Event';
import User from '../models/User';
import ServiceOrderItem from '../models/ServiceOrderItem';
import Item from '../models/Item';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';

export const createServiceOrder = async (req: Request, res: Response) => {
  const {
    eventId,
    createdDate,
    status,
    observations,
    checkedBy,
    orderBy,
    deployedBy
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
    res.status(201).json(serviceOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating role', error });
  }
};

export const getServiceOrderById = async (req: Request, res: any) => {
  const { id } = req.params
  try {
    const searchedServiceOrder = await ServiceOrder.findByPk(id, {
      include: [
        {
          model: ServiceOrderItem,
          include: [
            {
              model: Item,
            }
          ]
        }
      ]
    });
    if (!searchedServiceOrder) {
      return res.status(404).json({ message: 'Service Order not found' });
    }
    if (searchedServiceOrder.ServiceOrderItems && searchedServiceOrder.ServiceOrderItems.length !== 0) {
      const filterServiceOrderContainerItems = searchedServiceOrder.ServiceOrderItems.filter(serviceOrderItem => {
        if (serviceOrderItem.Item.isContainer) {
          return serviceOrderItem
        }
      })
      if (filterServiceOrderContainerItems && filterServiceOrderContainerItems.length !== 0) {
        const searchedServiceOrderStoreItem = await ServiceOrderStoreItem.findAll({
          where: {
            serviceOrderId: filterServiceOrderContainerItems.map(filterServiceOrderContainerItem => {
              return filterServiceOrderContainerItem.serviceOrderId
            }),
            itemIdParent: filterServiceOrderContainerItems.map(filterServiceOrderContainerItem => {
              return filterServiceOrderContainerItem.itemId
            }),
          },
          include: [
            { model: Item, as: 'ParentItem' },
            { model: Item, as: 'ChildItem' }
          ]
        })
        const filterServiceOrderNotContainerItems = searchedServiceOrder.ServiceOrderItems.filter(serviceOrderItem => {
          if (!serviceOrderItem.Item.isContainer) {
            return serviceOrderItem
          }
        })
        const newServiceOrder = {
          id: searchedServiceOrder.id,
          eventId: searchedServiceOrder.eventId,
          orderBy: searchedServiceOrder.orderBy,
          deployedBy: searchedServiceOrder.deployedBy,
          checkedBy: searchedServiceOrder.checkedBy,
          createdDate: searchedServiceOrder.createdDate,
          status: searchedServiceOrder.status,
          observations: searchedServiceOrder.observations,
          ServiceOrderItems: [...filterServiceOrderNotContainerItems, ...searchedServiceOrderStoreItem]
        }
        return res.status(200).json(newServiceOrder);
      }
    }
    return res.status(200).json(searchedServiceOrder);

  } catch (error) {
    console.error('Error fetching service order:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};