import { Request, Response } from "express";
import StoreItem from "../models/StoreItem";
import Item from "../models/Item"; // Asegúrate de importar el modelo de Item

export const createStoreItems = async (req: Request, res: any) => {
  try {
    const { itemIdsChild, itemIdParent } = req.body;

    if (!itemIdsChild || !Array.isArray(itemIdsChild) || itemIdsChild.length === 0 || !itemIdParent) {
      return res.status(400).json({ error: "Both itemIdsChild (array) and itemIdParent are required." });
    }

    // Validar si el parent existe
    const parentItem = await Item.findByPk(itemIdParent);
    if (!parentItem) {
      return res.status(404).json({ error: "Parent item does not exist." });
    }

    // Validar si todos los child items existen
    const existingChildItems = await Item.findAll({ where: { id: itemIdsChild } });
    const existingChildIds = existingChildItems.map(item => item.id);
    const missingChildIds = itemIdsChild.filter(id => !existingChildIds.includes(id));

    if (missingChildIds.length > 0) {
      return res.status(404).json({ error: `Some child items do not exist: ${missingChildIds.join(", ")}` });
    }

    // Crear múltiples relaciones en StoreItem
    const storeItems = itemIdsChild.map(childId => ({
      itemIdChild: childId,
      itemIdParent
    }));

    await StoreItem.bulkCreate(storeItems);

    return res.status(201).json({
      message: "StoreItems created successfully",
      data: storeItems,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const deleteStoreItem = async (req: Request, res: any) => {
  try {
    // Se espera que el primer parámetro sea el id del parent y el segundo el id del child
    const { parentId, childId } = req.params;

    if (!parentId || !childId) {
      return res.status(400).json({ error: "Se requieren ambos parámetros: parentId y childId." });
    }

    // Eliminar la relación en StoreItem que cumpla con ambos ids
    const deleteCount = await StoreItem.destroy({
      where: {
        itemIdParent: parentId,
        itemIdChild: childId,
      },
    });

    if (deleteCount === 0) {
      return res.status(404).json({ error: "No se encontró la asociación para eliminar." });
    }

    return res.status(200).json({ message: "StoreItem eliminado correctamente." });
  } catch (error) {
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};
