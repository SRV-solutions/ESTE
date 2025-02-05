import { Request, Response } from 'express';
import { Op } from 'sequelize';

import ServiceOrder, { ServiceOrderStatus } from '../models/ServiceOrder';
import ServiceOrderItem from '../models/ServiceOrderItem';
import Item from '../models/Item';
import Category from '../models/Category';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';
import { sequelize } from '../config/database';

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

export const createServiceOrderItems = async (req: Request, res: any) => {
  const { serviceOrderId, categoryId, quantity } = req.body;

  try {
    // Verificar si la orden de servicio existe
    const searchedServiceOrder = await ServiceOrder.findByPk(serviceOrderId);
    if (!searchedServiceOrder) {
      return res.status(404).json({ message: 'La orden de servicio no existe' });
    }

    // Obtener ítems de la categoría específica
    const searchedItems = await Item.findAll({
      include: {
        model: Category,
        where: { id: categoryId },
      },
    });

    if (searchedItems.length < quantity) {
      return res.status(404).json({ message: 'No hay suficientes ítems disponibles en esta categoría' });
    }

    // Obtener IDs de ítems ya asociados a órdenes activas o almacenados
    const activeItemIds = new Set(
      await ServiceOrderItem.findAll({
        attributes: ['itemId'],
        include: {
          model: ServiceOrder,
          where: {
            status: { [Op.ne]: ServiceOrderStatus.Disassembled },
          },
        },
      }).then((items) => items.map((item) => item.itemId))
    );

    const storedItemIds = new Set(
      await ServiceOrderStoreItem.findAll({
        attributes: ['itemIdChild'],
        include: {
          model: ServiceOrder,
          where: {
            status: { [Op.ne]: ServiceOrderStatus.Disassembled },
          },
        },
      }).then((items) => items.map((item) => item.itemIdChild))
    );

    // Filtrar ítems disponibles
    const availableItems = searchedItems.filter(
      (item) => !activeItemIds.has(item.id) && !storedItemIds.has(item.id)
    );

    if (availableItems.length < quantity) {
      return res.status(404).json({ message: 'No hay suficientes ítems disponibles fuera de órdenes activas' });
    }

    // Crear ítems seleccionados
    const depuredItems = availableItems.slice(0, quantity).map((item) => ({
      serviceOrderId,
      itemId: item.id,
    }));

    const newServiceOrderItems = await ServiceOrderItem.bulkCreate(depuredItems);

    res.status(201).json({ message: 'Ítems creados exitosamente', data: newServiceOrderItems });
  } catch (error) {
    console.error('Error al crear ítems en la orden de servicio:', error);
    res.status(500).json({ message: 'Error creando ítems en la orden de servicio', error });
  }
};

export const deleteServiceOrderItems = async (req: Request, res: any) => {
  const { serviceOrderId } = req.params;

  try {
    if (!serviceOrderId) {
      return res.status(400).json({ message: 'Debe seleccionar una orden de servicio válida.' });
    }

    const itemsToDelete = await ServiceOrderItem.findAll({ where: { serviceOrderId } });

    if (itemsToDelete.length === 0) {
      return res.status(404).json({ message: `No se encontraron items para la orden de servicio con ID ${serviceOrderId}.` });
    }

    const iteToDeleteIds = itemsToDelete.map(item => item.itemId);

    const containerItems = await Item.findAll({
      where: { id: iteToDeleteIds },
      include: [
        {
          model: Category,
          where: { isContainer: true },
        },
      ],
    });

    const containerItemIds = containerItems.map(item => item.id);

    const deletedContainers = await ServiceOrderStoreItem.destroy({
      where: {
        itemIdParent: containerItemIds,
        serviceOrderId,
      },
    });


    const deletedItems = await ServiceOrderItem.destroy({
      where: { serviceOrderId },
    });

    return res.status(200).json({
      message: 'Items de la orden de servicio eliminados exitosamente.',
      deletedContainers,
      deletedItems,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error al eliminar items de la orden de servicio.',
      error: error,
    });
  }
};

export const deleteServiceOrderItem = async (req: Request, res: any) => {
  const { serviceOrderId, itemId } = req.params;
  try {
    if (!serviceOrderId) {
      return res.status(400).json({ message: 'Debe seleccionar una orden de servicio válida' });
    }

    const itemsToDelete = await ServiceOrderItem.findAll(
      {
        where: { serviceOrderId },
        include: [{
          model: Item,
          include: [Category]
        }]

      });

    if (itemsToDelete.length === 0) {
      return res.status(404).json({ message: `No se encontraron ítems para la orden de servicio con ID ${serviceOrderId}` });
    }

    const itemToDeleteExist = itemsToDelete.find(item => item.itemId === Number(itemId));

    if (!itemToDeleteExist) {
      return res.status(404).json({ message: `El ítem con ID ${itemId} no se encuentra en la orden de servicio ${serviceOrderId}` });
    }

    if (itemToDeleteExist?.Item.Category.isContainer) {
      const containerItemsToDelete = await ServiceOrderStoreItem.findAll({
        where: {
          serviceOrderId: serviceOrderId,
          itemIdParent: itemId
        }
      })

      if (containerItemsToDelete.length > 0) {
        await ServiceOrderStoreItem.destroy({
          where: {
            id: containerItemsToDelete.map(item => item.id)
          },
        });
      }
    }

    await ServiceOrderItem.destroy({
      where: {
        serviceOrderId,
        itemId,
      },
    });

    res.status(200).json({ message: 'Ítem eliminado exitosamente de la orden de servicio' });
  } catch (error) {
    console.error('Error al eliminar ítem de la orden de servicio:', error);
    res.status(500).json({
      message: 'Ocurrió un error al intentar eliminar el ítem de la orden de servicio',
      error: error instanceof Error ? error.message : error,
    });
  }
};

export const changeItemsByServiceOrderId = async (req: Request, res: any) => {
  try {
    const { oldItemId, newItemId, serviceOrderId } = req.params;

    // Validar que los parámetros sean numéricos
    if (isNaN(Number(oldItemId)) || isNaN(Number(newItemId)) || isNaN(Number(serviceOrderId))) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    // Buscar los registros
    const [oldItem, newItem, serviceOrder] = await Promise.all([
      Item.findByPk(oldItemId),
      Item.findByPk(newItemId),
      ServiceOrder.findByPk(serviceOrderId, {
        include: [{ model: ServiceOrderItem }],
      }),
    ]);

    // Validar existencia de registros
    if (!oldItem || !newItem || !serviceOrder) {
      return res.status(404).json({ error: "Orden de servicio o ítems no encontrados" });
    }

    const transaction = await sequelize.transaction();

    try {
      const serviceOrderItem = await ServiceOrderItem.findOne({
        where: { serviceOrderId, itemId: oldItem.id },
        transaction
      });

      const serviceOrderStoreItem = await ServiceOrderStoreItem.findOne({
        where: { serviceOrderId, itemIdChild: oldItem.id },
        transaction
      });

      if (serviceOrderStoreItem) {
        await ServiceOrderStoreItem.create(
          {
            serviceOrderId: serviceOrderStoreItem.serviceOrderId,
            itemIdParent: serviceOrderStoreItem.itemIdParent,
            itemIdChild: newItem.id,
          },
          { transaction }
        );

        await serviceOrderStoreItem.destroy({ transaction });
      }

      if (serviceOrderItem) {
        await ServiceOrderItem.create(
          { serviceOrderId, itemId: newItem.id },
          { transaction }
        );

        await serviceOrderItem.destroy({ transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        message: "Ítem actualizado correctamente",
        oldItemId: oldItem.id,
        newItemId: newItem.id,
        serviceOrderId,
      });

    } catch (error) {
      await transaction.rollback();
      console.error("Error al actualizar ítem en la orden de servicio:", error);
      return res.status(500).json({ error: "Error al actualizar ítem en la orden de servicio" });
    }

  } catch (error) {
    console.error("Error en changeItemsByServiceOrderId:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const changeContainerItemsByServiceOrderId = async (req: Request, res: any) => {
  const transaction = await sequelize.transaction(); // Iniciar transacción
  try {
    const { oldItemId, newItemId, serviceOrderId } = req.params;

    // Validar que los parámetros sean números
    if (isNaN(Number(oldItemId)) || isNaN(Number(newItemId)) || isNaN(Number(serviceOrderId))) {
      return res.status(400).json({ error: "Parámetros inválidos" });
    }

    // Buscar registros en paralelo
    const [oldItem, newItem, serviceOrder] = await Promise.all([
      Item.findByPk(oldItemId, { transaction }),
      Item.findByPk(newItemId, { transaction }),
      ServiceOrder.findByPk(serviceOrderId, {
        include: [{ model: ServiceOrderStoreItem }],
        transaction,
      }),
    ]);

    // Validar existencia de registros
    if (!oldItem || !newItem || !serviceOrder) {
      return res.status(404).json({ error: "Orden de servicio o ítems no encontrados" });
    }

    // Buscar los items hijos del ítem antiguo en la orden de servicio
    const serviceOrderStoreItems = await ServiceOrderStoreItem.findAll({
      where: { serviceOrderId, itemIdParent: oldItem.id },
      transaction,
    });

    if (!serviceOrderStoreItems.length) {
      return res.status(404).json({ error: "El ítem antiguo no está en la orden de servicio" });
    }

    // Crear los nuevos registros para el ítem nuevo con los hijos del ítem antiguo
    const newStoreItems = serviceOrderStoreItems.map(storeItem => ({
      serviceOrderId: storeItem.serviceOrderId,
      itemIdParent: newItem.id,
      itemIdChild: storeItem.itemIdChild,
    }));

    await ServiceOrderStoreItem.bulkCreate(newStoreItems, { transaction });

    // Eliminar los registros antiguos
    await ServiceOrderStoreItem.destroy({
      where: { serviceOrderId, itemIdParent: oldItem.id },
      transaction,
    });

    // Agregar el nuevo ítem a ServiceOrderItem
    await ServiceOrderItem.create({ serviceOrderId, itemId: newItem.id }, { transaction });

    // Eliminar el antiguo ítem de ServiceOrderItem
    await ServiceOrderItem.destroy({
      where: { serviceOrderId, itemId: oldItem.id },
      transaction,
    });

    // Confirmar transacción
    await transaction.commit();

    return res.status(200).json({
      message: "Ítem actualizado correctamente",
      oldItemId: oldItem.id,
      newItemId: newItem.id,
      serviceOrderId,
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error en changeContainerItemsByServiceOrderId:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
