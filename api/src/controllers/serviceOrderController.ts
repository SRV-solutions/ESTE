import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import ServiceOrder from '../models/ServiceOrder';
import Event from '../models/Event';
import User from '../models/User';
import ServiceOrderItem from '../models/ServiceOrderItem';
import Item from '../models/Item';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';
import Category from '../models/Category';
import StoreItem from '../models/StoreItem';

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
              include: [Category],
            },
          ],
        },
        {
          model: User,
          as: 'DeployedBy', // Incluyendo el usuario que realizó el deploy
        },
        {
          model: User,
          as: 'CheckedBy', // Incluyendo el usuario que realizó el check
        },
        {
          model: User,
          as: 'OrderedBy', // Incluyendo el usuario que realizó la orden
        },
        {
          model: Event,
          as: 'Event', // Incluyendo la información del evento
        },
      ],
    });

    if (!searchedServiceOrder) {
      return res.status(404).json({ message: 'Service Order not found' });
    }

    // Obtener los items que son contenedores
    const containerItems = searchedServiceOrder.ServiceOrderItems.filter(
      (serviceOrderItem) => serviceOrderItem.Item.Category.isContainer
    );

    // Obtener los items que no son contenedores
    const nonContainerItems = searchedServiceOrder.ServiceOrderItems.filter(
      (serviceOrderItem) => !serviceOrderItem.Item.Category.isContainer
    );

    // Obtener los items que están dentro de los contenedores
    let itemsInContainers: Array<any> = [];
    if (containerItems.length > 0) {
      const containerIds = containerItems.map((item) => item.itemId);

      itemsInContainers = await ServiceOrderStoreItem.findAll({
        where: {
          itemIdParent: containerIds, // Buscar los items dentro de los contenedores
        },
        include: [{
          model: Item,
          as: 'ServiceOrderStoreItemChild',
          include: [{
            model: Category
          }]
        }],
      });

      const allStoreItems = await StoreItem.findAll({
        where: {
          itemIdParent: containerIds, // Buscar los items dentro de los contenedores
        },
        include: [{
          model: Item,
          as: 'StoreItemChild',
          include: [{
            model: Category
          }]
        }],
      });
      itemsInContainers.push(...allStoreItems)
    }

    // Preparar la respuesta con los items dentro de los contenedores
    const responseItems = containerItems.map((container) => {
      const containedItems = itemsInContainers.filter(
        (child) => child.itemIdParent === container.itemId
      );
      const parsedJson = container.toJSON()
      parsedJson.Item.StoreItemParentItem = containedItems.map((childItem) => childItem.ServiceOrderStoreItemChild ? childItem.ServiceOrderStoreItemChild.toJSON() : childItem.StoreItemChild.toJSON())
      return parsedJson
    });

    // Construir la nueva orden de servicio con todos los datos
    const newServiceOrder = {
      ...searchedServiceOrder.toJSON(),
      DeployedBy: searchedServiceOrder.DeployedBy?.toJSON(),
      CheckedBy: searchedServiceOrder.CheckedBy?.toJSON(),
      OrderedBy: searchedServiceOrder.OrderedBy?.toJSON(),
      Event: searchedServiceOrder.Event?.toJSON(),
      ServiceOrderItems: [
        ...nonContainerItems.map((item) => item.toJSON()),
        ...responseItems
      ],
    };

    return res.status(200).json(newServiceOrder);
  } catch (error) {
    console.error('Error fetching service order:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};


export const getServiceOrders = async (req: Request, res: any) => {
  try {
    // Obtener el token del encabezado Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader ? authHeader.split(' ')[1] : undefined;

    // Verificar si el token está presente
    if (!token) {
      return res.status(401).json({ message: 'No autorizado. Token no proporcionado.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

    // Verificar y decodificar el token de forma síncrona
    let userData;
    try {
      userData = jwt.verify(token, JWT_SECRET) as any;
    } catch (err) {
      return res.status(403).json({ message: 'Token inválido o expirado.' });
    }

    // Verificar si el usuario está en el token
    if (!userData) {
      return res.status(401).json({ message: 'Token inválido.' });
    }

    // Obtener las órdenes de servicio
    const serviceOrders = await ServiceOrder.findAll({
      include: [
        {
          model: User,
          as: 'DeployedBy',
          attributes: ['id', 'username', 'email', 'roleId'], // Solo traer los campos necesarios
        },
        {
          model: User,
          as: 'CheckedBy',
          attributes: ['id', 'username', 'email', 'roleId'],
        },
        {
          model: User,
          as: 'OrderedBy',
          attributes: ['id', 'username', 'email', 'roleId'],
        },
        {
          model: Event,
          as: 'Event',
        },
      ],
    });

    // Filtrar las órdenes dependiendo si el usuario es admin o no
    const filteredOrders = serviceOrders.filter((order) => {
      return (
        order.CheckedBy.id === userData.id ||
        order.OrderedBy.id === userData.id ||
        order.DeployedBy.id === userData.id
      );
    });

    const finalServiceOrders = userData.isAdmin ? serviceOrders : filteredOrders;

    // Si no hay órdenes de servicio, retornar un error
    if (finalServiceOrders.length === 0) {
      return res.status(404).json({ message: 'No se encontraron órdenes de servicio.' });
    }

    // Retornar las órdenes encontradas
    return res.status(200).json(finalServiceOrders);
  } catch (error) {
    console.error('Error al obtener las órdenes de servicio:', error);
    return res.status(500).json({ message: 'Error interno del servidor.', error });
  }
};
