import { Request, Response } from 'express';
import ServiceOrder from '../models/ServiceOrder';
import Event from '../models/Event';
import User from '../models/User';
import ServiceOrderItem from '../models/ServiceOrderItem';
import Item from '../models/Item';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';
import Category from '../models/Category';

export const createServiceOrder = async (req: Request, res: Response) => {
  const {
    eventId,
    createdDate,
    status,
    observations,
    checkedBy,
    orderedBy,
    deployedBy
  } = req.body;

  try {
    const event = await Event.findByPk(eventId)
    if (!event) {
      res.status(404).json({ message: 'Event not not found' });
      return
    }
    const user = await User.findByPk(orderedBy)
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
      orderedBy,
      deployedBy
    });
    res.status(201).json(serviceOrder);
  } catch (error) {
    res.status(500).json({ message: 'Error creating role', error });
  }
};

export const getServiceOrderById = async (req: Request, res: any) => {
  const { id } = req.params;
  try {
    const searchedServiceOrder = await ServiceOrder.findByPk(id, {
      include: [
        {
          model: ServiceOrderItem,
          include: [
            {
              model: Item,
              include: [Category]
            },
          ],
        },
        {
          model: User,
          as: 'DeployedBy',
        },
        {
          model: User, 
          as: 'CheckedBy'
        },
        {
          model: User, 
          as: 'OrderedBy'
        },
        {
          model: Event,
          as: 'Event',
        },
      ],
    });

    if (!searchedServiceOrder) {
      return res.status(404).json({ message: 'Service Order not found' });
    }

    const containerItems = searchedServiceOrder.ServiceOrderItems.filter(
      (serviceOrderItem) => {
        //serviceOrderItem.Item.isContainer
        console.log(serviceOrderItem.Item);
        
      }
    );

    // const nonContainerItems = searchedServiceOrder.ServiceOrderItems.filter(
    //   (serviceOrderItem) => !serviceOrderItem.Item.isContainer
    // );

    let itemsInContainers: Array<any> = [];
    if (containerItems.length > 0) {
      const containerIds = containerItems.map((item) => item.itemId);
      itemsInContainers = await ServiceOrderStoreItem.findAll({
        where: {
          itemIdParent: containerIds,
        },
        include: [{ model: Item, as: 'ChildItem' }],
      });
    }

    const responseItems = containerItems.map((container) => {
      const containedItems = itemsInContainers.filter(
        (child) => child.itemIdParent === container.itemId
      );
      return {
        ...container.toJSON(),
        containedItems: containedItems.map((childItem) =>
          childItem.ChildItem.toJSON()
        ),
      };
    });

    // const newServiceOrder = {
    //   ...searchedServiceOrder.toJSON(),
    //   DeployedBy: searchedServiceOrder.DeployedBy?.toJSON(),
    //   CheckedBy: searchedServiceOrder.CheckedBy?.toJSON(),
    //   OrderedBy: searchedServiceOrder.OrderedBy?.toJSON(),
    //   Event: searchedServiceOrder.Event?.toJSON(),
    //   ServiceOrderItems: [
    //     ...nonContainerItems.map((item) => item.toJSON()),
    //     ...responseItems,
    //   ],
    // };

    return res.status(200)
    // .json(newServiceOrder);
  } catch (error) {
    console.error('Error fetching service order:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
