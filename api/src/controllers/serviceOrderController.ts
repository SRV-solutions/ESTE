import { Request } from 'express';
import jwt from 'jsonwebtoken';

import ServiceOrder, { ServiceOrderStatus } from '../models/ServiceOrder';
import Event from '../models/Event';
import User from '../models/User';
import ServiceOrderItem from '../models/ServiceOrderItem';
import Item from '../models/Item';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';
import Category from '../models/Category';
import StoreItem from '../models/StoreItem';
import Location from '../models/Location';

export const createServiceOrder = async (req: any, res: any) => {
  const {
    eventId,
    createdDate,
    incomeDate = null,
    outcomeDate = null,
    assemblyDate = null,
    disassemblyDate = null,
    status,
    observations,
    checkedBy = null,
    orderedBy,
    deployedBy = null,
  } = req.body;

  // Usuario autenticado desde el middleware `isAuth`
  const authenticatedUser = req.user;

  try {
    // Validar si el evento existe
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Validar si el usuario autenticado tiene permiso para asignar la orden

    if (orderedBy !== authenticatedUser.id && authenticatedUser.roleId !== 1) {
      return res.status(403).json({
        message: 'No tienes permisos para asignar esta orden a otro usuario.'
      });
    }

    // Validar si el usuario al que se asigna la orden existe
    const user = await User.findByPk(orderedBy);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Crear la orden de servicio    
    const serviceOrder = await ServiceOrder.create({
      eventId,
      createdDate,
      incomeDate,
      outcomeDate,
      assemblyDate,
      disassemblyDate,
      status,
      observations,
      checkedBy,
      orderedBy,
      deployedBy,
    });



    return res.status(201).json(serviceOrder);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Error creating service order',
      error: error.message
    });
  }
};

export const getServiceOrderById = async (req: Request, res: any) => {
  const { id } = req.params;

  try {
    // Buscar la orden de servicio
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
          include: [Location]
        },
      ],
    });

    if (!searchedServiceOrder) {
      return res.status(404).json({ message: 'Service Order not found' });
    }

    // Obtener el estado actual de la orden
    const { status } = searchedServiceOrder;

    // Filtrar los ServiceOrderItems según el estado de la orden
    const filteredServiceOrderItems =
      status === 'disassembled'
        ? searchedServiceOrder.ServiceOrderItems.filter((item) => !item.isActive) // Solo los desactivados
        : searchedServiceOrder.ServiceOrderItems.filter((item) => item.isActive); // Solo los activos

    // Separar contenedores y no contenedores
    const containerItems = filteredServiceOrderItems.filter(
      (serviceOrderItem) => serviceOrderItem.Item.Category.isContainer
    );

    const nonContainerItems = filteredServiceOrderItems.filter(
      (serviceOrderItem) => !serviceOrderItem.Item.Category.isContainer
    );

    // Obtener los items dentro de los contenedores
    let itemsInContainers: Array<any> = [];
    if (containerItems.length > 0) {
      const containerIds = containerItems.map((item) => item.itemId);

      itemsInContainers = await ServiceOrderStoreItem.findAll({
        where: {
          itemIdParent: containerIds, // Buscar los items dentro de los contenedores
          isActive: status === 'disassembled' ? false : true, // Filtrar según estado de la orden
        },
        include: [
          {
            model: Item,
            as: 'ServiceOrderStoreItemChild',
            include: [Category],
          },
        ],
      });

      const allStoreItems = await StoreItem.findAll({
        where: {
          itemIdParent: containerIds, // Buscar los items dentro de los contenedores
        },
        include: [
          {
            model: Item,
            as: 'StoreItemChild',
            include: [Category],
          },
        ],
      });
      itemsInContainers.push(...allStoreItems);
    }

    // Preparar la respuesta con los items dentro de los contenedores
    const responseItems = containerItems.map((container) => {
      const containedItems = itemsInContainers.filter(
        (child) => child.itemIdParent === container.itemId
      );

      const parsedJson = container.toJSON();
      parsedJson.Item.StoreItemParentItem = containedItems.map((childItem) =>
        childItem.ServiceOrderStoreItemChild
          ? childItem.ServiceOrderStoreItemChild.toJSON()
          : childItem.StoreItemChild.toJSON()
      );

      const hasServiceOrderStoreItemChild = containedItems.some(
        (childItem) => "ServiceOrderStoreItemChild" in childItem
      );
      const hasStoreItemChild = containedItems.some(
        (childItem) => "StoreItemChild" in childItem
      );
      parsedJson.Item.isTemporalContainer = hasServiceOrderStoreItemChild || !hasStoreItemChild;

      return parsedJson;
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
        ...responseItems,
      ],
    };

    return res.status(200).json(newServiceOrder);
  } catch (error) {
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
          attributes: ['id', 'username', 'email', 'roleId'],
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
          include: [Location]
        },
      ],
    });

    // Si no hay órdenes de servicio, retornar un error
    if (serviceOrders.length === 0) {
      return res.status(404).json({ message: 'No se encontraron órdenes de servicio.' });
    }

    // Retornar las órdenes encontradas
    return res.status(200).json(serviceOrders);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor.', error });
  }
};

export const updateStatusServiceOrderById = async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(ServiceOrderStatus).includes(status)) {
      return res.status(400).json({
        message: `Estado no permitido. Los estados válidos son: ${Object.values(ServiceOrderStatus).join(', ')}`,
      });
    }

    const serviceOrder = await ServiceOrder.findByPk(id);

    if (!serviceOrder) {
      return res.status(404).json({ message: 'Orden de servicio no encontrada.' });
    }

    serviceOrder.status = status;

    if (status === 'disassembled') {
      // Cambiar `isActive` a false para todos los `ServiceOrderItems` de la orden de servicio
      await ServiceOrderItem.update(
        { isActive: false }, // Cambiar isActive a false
        { where: { serviceOrderId: id } } // Filtro: items de esta orden de servicio
      );

      // Cambiar `isActive` a false para todos los `ServiceOrderStoreItems` de la orden de servicio
      await ServiceOrderStoreItem.update(
        { isActive: false }, // Cambiar isActive a false
        { where: { serviceOrderId: id } } // Filtro: items almacenados de esta orden de servicio
      );
    } else {
      await ServiceOrderItem.update(
        { isActive: true }, // Cambiar isActive a false
        { where: { serviceOrderId: id } } // Filtro: items de esta orden de servicio
      );

      // Cambiar `isActive` a false para todos los `ServiceOrderStoreItems` de la orden de servicio
      await ServiceOrderStoreItem.update(
        { isActive: true }, // Cambiar isActive a false
        { where: { serviceOrderId: id } } // Filtro: items almacenados de esta orden de servicio
      );
    }


    await serviceOrder.save();

    return res.status(200).json({
      message: 'Estado de la orden de servicio actualizado correctamente.',
      serviceOrder,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor.', error });
  }
};

export const updateServiceOrderById = async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // Validar que sea un ID válido
    const serviceOrderId = parseInt(id);
    if (isNaN(serviceOrderId)) {
      return res.status(400).json({ message: 'ID de orden de servicio inválido.' });
    }

    // Buscar la orden de servicio
    const serviceOrder = await ServiceOrder.findByPk(serviceOrderId, {
      include: ['Event', 'OrderedBy', 'CheckedBy', 'DeployedBy']
    });

    if (!serviceOrder) {
      return res.status(404).json({ message: 'Orden de servicio no encontrada.' });
    }

    // Validar status si viene en el body
    if (updates.status && !Object.values(ServiceOrderStatus).includes(updates.status)) {
      return res.status(400).json({
        message: `Estado no permitido. Los estados válidos son: ${Object.values(ServiceOrderStatus).join(', ')}`,
      });
    }

    // Actualizar los campos permitidos
    const allowedUpdates = [
      'checkedBy',
      'deployedBy',
      'status',
      'observations',
      'incomeDate',
      'outcomeDate',
      'assemblyDate',
      'disassemblyDate'
    ];

    const validUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        const toNullIfEmpty = (v: any) => v === '' ? null : v;
        validUpdates[key] = toNullIfEmpty(value);
      }
    }


    Object.assign(serviceOrder, validUpdates);
    await serviceOrder.save();

    // Lógica especial para status 'disassembled'
    if (updates.status === 'disassembled') {
      await ServiceOrderItem.update(
        { isActive: false },
        { where: { serviceOrderId: serviceOrderId } }
      );

      await ServiceOrderStoreItem.update(
        { isActive: false },
        { where: { serviceOrderId: serviceOrderId } }
      );
    } else if (updates.status) {
      await ServiceOrderItem.update(
        { isActive: true },
        { where: { serviceOrderId: serviceOrderId } }
      );

      await ServiceOrderStoreItem.update(
        { isActive: true },
        { where: { serviceOrderId: serviceOrderId } }
      );
    }

    // Traer la orden actualizada con relaciones
    const updatedServiceOrder = await ServiceOrder.findByPk(serviceOrderId, {
      include: ['Event', 'OrderedBy', 'CheckedBy', 'DeployedBy']
    });

    return res.status(200).json({
      message: 'Orden de servicio actualizada correctamente.',
      serviceOrder: updatedServiceOrder,
    });

  } catch (error: any) {
    console.error('Error updating service order:', error);
    return res.status(500).json({
      message: 'Error interno del servidor.',
      error: error.message
    });
  }
};