import { Request } from 'express';
import { Op } from 'sequelize';
import csvParser from "csv-parser";
import fs from "fs";

import Category from '../models/Category';
import Item from '../models/Item';
import User from '../models/User';
import StoreItem from '../models/StoreItem';
import ServiceOrderItem from '../models/ServiceOrderItem';
import ServiceOrder, { ServiceOrderStatus } from '../models/ServiceOrder';
import ServiceOrderStoreItem from '../models/ServiceOrderStoreItem';

export const getItems = async (req: Request, res: any) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category || '';  // Recibir categoría desde la query
    const offset = (page - 1) * limit;
    const search = req.query.search || ''; // ← Agregar el término de búsqueda
    // Obtener items con hijos, aplicando el filtro de búsqueda
    const itemsWithChildren = await Item.findAll({
      where: {
        code: {
          [Op.iLike]: `%${search}%`, // Filtrar por código (puedes agregar más filtros si es necesario)
        },
        ...(category && { categoryId: category }), // Filtrar por categoría si está presente
      },
      include: [
        {
          model: Category,
          where: { isContainer: true }
        },
        {
          model: StoreItem,
          as: "StoreItemParent",
          include: [
            {
              model: Item,
              as: "StoreItemChild",
              include: [{ model: Category }],
            },
          ],
        },
      ],
    });
    const filteredItemsWithChildren = itemsWithChildren.filter(item => item.StoreItemParent.length !== 0);

    const childItemIds = filteredItemsWithChildren.flatMap((item: any) => {
      const parentId = item.id;
      const childIds = item.StoreItemParent.map((storeItem: any) => storeItem.StoreItemChild.id);
      return [parentId, ...childIds];
    });

    const itemsWithoutChildren = await Item.findAll({
      where: {
        id: { [Op.notIn]: childItemIds },
        code: {
          [Op.iLike]: `%${search}%`, // Filtro por código
        },
        ...(category && { categoryId: category }), // Filtrar por categoría si está presente
      },
      include: [{ model: Category }],
    });

    // Combinar resultados y paginar
    const cleanItems = [...filteredItemsWithChildren, ...itemsWithoutChildren];
    const allItems = cleanItems.sort((a, b) => {
      const codeA = a.code;
      const codeB = b.code;

      // Función para dividir el código en partes numéricas y alfabéticas
      const alphanumericCompare = (strA: any, strB: any) => {
        const regex = /(\D+|\d+)/g; // Captura las secuencias alfabéticas y numéricas
        const partsA = strA.match(regex);
        const partsB = strB.match(regex);

        // Comparar parte por parte
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const partA = partsA[i] || '';
          const partB = partsB[i] || '';

          // Si ambas partes son numéricas, compararlas como números
          if (!isNaN(partA) && !isNaN(partB)) {
            const numA = parseInt(partA, 10);
            const numB = parseInt(partB, 10);
            if (numA !== numB) {
              return numA - numB;
            }
          } else {
            // Si son alfabéticas, compararlas alfabéticamente
            if (partA < partB) return -1;
            if (partA > partB) return 1;
          }
        }
        return 0;
      };

      return alphanumericCompare(codeA, codeB);
    });
    const paginatedItems = allItems.slice(offset, offset + limit);

    return res.json({
      totalItems: allItems.length,
      totalPages: Math.ceil(allItems.length / limit),
      currentPage: page,
      items: paginatedItems
    });

  } catch (error) {

    res.status(500).json({ message: "Error fetching items", error });
  }
};

export const createItem = async (req: Request, res: any) => {
  const {
    uses = 0,
    ownerId = 1,
    categoryId,
    name,
    description,
    type,
    quantity = 1,
    unity,
    value,
    code,
    weight,
    isStorable,
    isContainer,
  } = req.body;

  try {

    const searchedUserOwner = await User.findByPk(ownerId);
    if (!searchedUserOwner) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    let finalCategoryId = categoryId;

    if (!categoryId) {
      if (!name || !type || !unity || value === undefined || weight === undefined || isStorable === undefined || isContainer === undefined) {
        return res.status(400).json({ message: 'Faltan datos obligatorios para crear una categoría.' });
      }

      const newCategory = await Category.create({
        name,
        description,
        code,
        type,
        unity,
        value,
        weight,
        isStorable,
        isContainer,
        isActive: true,
      });

      finalCategoryId = newCategory.id;
    } else {
      // Validar existencia de la categoría
      const category = await Category.findByPk(Number(categoryId));
      if (!category) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
    }
    // Crear ítems (bulk siempre, incluso si bulkQuantity es 1)
    const itemsToCreate = Array.from({ length: quantity }, () => ({
      isActive: true,
      uses,
      ownerId,
      categoryId: finalCategoryId
    }));

    await Item.bulkCreate(itemsToCreate);

    return res.status(201).json({ message: `${quantity} ítem(s) creado(s) con éxito` });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor', error });
  }
};

export const deleteItem = async (req: Request, res: any) => {
  const { id } = req.params;

  try {
    const item = await Item.findByPk(id);

    if (!item) {
      return res.status(404).json({ message: 'Ítem no encontrado' });
    }

    await item.destroy();
    return res.json({ message: 'Ítem eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error eliminando el ítem', error });
  }
};

export const getAvalibleItemsByCategory = async (req: Request, res: any) => {
  const { categoryId } = req.body
  const items = await Item.findAll({
    include: [
      {
        model: ServiceOrderItem,
        required: false, // LEFT OUTER JOIN para incluir también los que no tienen órdenes
        include: [
          {
            model: ServiceOrder,
            required: false, // LEFT OUTER JOIN en ServiceOrder
            where: {
              status: { [Op.ne]: ServiceOrderStatus.Disassembled },
            },
          },
        ],
      },
      Category
    ],
    where: {
      // Filtra los items que no tienen órdenes activas
      '$ServiceOrderItems.ServiceOrder.id$': null,
      categoryId
    },
  });

  const sortedItems = items.sort((a, b) => {
    const regex = /-(\d+)$/; // Captura el número al final del código
    const numA = parseInt(a.code.match(regex)?.[1] || "0", 10);
    const numB = parseInt(b.code.match(regex)?.[1] || "0", 10);

    // Primero ordenamos alfabéticamente sin el número final
    const baseA = a.code.replace(regex, "");
    const baseB = b.code.replace(regex, "");
    const textComparison = baseA.localeCompare(baseB);

    return textComparison !== 0 ? textComparison : numA - numB;
  });

  return res.status(201).json(sortedItems);
}

export const getAvalibleItems = async (req: Request, res: any) => {
  try {
    const items = await Item.findAll({
      include: [
        {
          model: ServiceOrderItem,
          required: false, // LEFT OUTER JOIN para incluir también los que no tienen órdenes
          include: [
            {
              model: ServiceOrder,
              required: false, // LEFT OUTER JOIN en ServiceOrder
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled }, // Solo ordenes que no están desarmadas
              },
            },
          ],
        },
        {
          model: ServiceOrderStoreItem,
          required: false, // LEFT OUTER JOIN para verificar si está en algún ServiceOrderStoreItem
          as: 'ServiceOrderStoreItemParent', // Usamos el alias para la relación 'itemIdParent'
          include: [
            {
              model: ServiceOrder,
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled }, // Asegura que esté en una orden no desarmada
              },
            },
          ],
        },
        {
          model: ServiceOrderStoreItem,
          required: false, // LEFT OUTER JOIN para verificar si está en algún ServiceOrderStoreItem
          as: 'ServiceOrderStoreItemChild', // Usamos el alias para la relación 'itemIdChild'
          include: [
            {
              model: ServiceOrder,
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled }, // Asegura que esté en una orden no desarmada
              },
            },
          ],
        },
        Category,
      ],
      where: {
        // Filtra los items que no están en ninguna orden de servicio activa
        '$ServiceOrderItems.ServiceOrder.id$': null,
        // Filtra los ítems que no están dentro de ningún baúl que esté relacionado con una orden de servicio no desarmada
        '$ServiceOrderStoreItemParent.id$': null,
        '$ServiceOrderStoreItemChild.id$': null,
      },
    });

    const sortedItems = items.sort((a, b) => {
      const regex = /-(\d+)$/; // Captura el número al final del código
      const numA = parseInt(a.code.match(regex)?.[1] || "0", 10);
      const numB = parseInt(b.code.match(regex)?.[1] || "0", 10);

      // Primero ordenamos alfabéticamente sin el número final
      const baseA = a.code.replace(regex, "");
      const baseB = b.code.replace(regex, "");
      const textComparison = baseA.localeCompare(baseB);

      return textComparison !== 0 ? textComparison : numA - numB;
    });

    return res.status(200).json(sortedItems);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al obtener los ítems disponibles.' });
  }
};

export const getAvailableStoreItems = async (req: Request, res: any) => {
  try {
    const items = await Item.findAll({
      include: [
        {
          model: ServiceOrderItem,
          required: false,
          include: [
            {
              model: ServiceOrder,
              required: false,
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled },
              },
            },
          ],
        },
        {
          model: ServiceOrderStoreItem,
          required: false,
          as: "ServiceOrderStoreItemParent",
          include: [
            {
              model: ServiceOrder,
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled },
              },
            },
          ],
        },
        {
          model: ServiceOrderStoreItem,
          required: false,
          as: "ServiceOrderStoreItemChild",
          include: [
            {
              model: ServiceOrder,
              where: {
                status: { [Op.ne]: ServiceOrderStatus.Disassembled },
              },
            },
          ],
        },
        {
          model: StoreItem,
          required: false,
          as: "StoreItemParent",
        },
        {
          model: StoreItem,
          required: false,
          as: "StoreItemChild",
        },
        {
          model: Category,
          required: true,
          where: {
            isStorable: true,
          }
        }
      ],
      where: {
        "$ServiceOrderItems.ServiceOrder.id$": null,
        "$StoreItemParent.id$": null,
        "$StoreItemChild.id$": null,
        "$ServiceOrderStoreItemParent.id$": null,
        "$ServiceOrderStoreItemChild.id$": null,
      },
    });

    const sortedItems = items.sort((a, b) => {
      const regex = /-(\d+)$/; // Captura el número al final del código
      const numA = parseInt(a.code.match(regex)?.[1] || "0", 10);
      const numB = parseInt(b.code.match(regex)?.[1] || "0", 10);

      // Primero ordenamos alfabéticamente sin el número final
      const baseA = a.code.replace(regex, "");
      const baseB = b.code.replace(regex, "");
      const textComparison = baseA.localeCompare(baseB);

      return textComparison !== 0 ? textComparison : numA - numB;
    });

    return res.status(200).json(sortedItems);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al obtener los ítems disponibles." });
  }
};

export const uploadCSV = async (req: Request | any, res: Response | any) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se proporcionó ningún archivo" });
  }


  try {
    const items: any[] = [];

    // Leer CSV
    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on("data", (row) => items.push(row))
      .on("end", async () => {
        try {
          // Procesar categorías y construir los ítems en paralelo
          const itemsToCreate = await Promise.all(
            items.map(async (item) => {
              let category = await Category.findOne({
                where: { code: item.codigo },
              });

              if (!category) {
                category = await Category.create(
                  {
                    name: item.nombre,
                    description: item.descripcion,
                    code: item.codigo,
                    type: item.tipo,
                    unity: item.unidad,
                    value: parseFloat(item.valor),
                    weight: parseFloat(item.peso),
                    isStorable: item.es_almacenable.toLowerCase() === "si",
                    isContainer: item.es_contenedor.toLowerCase() === "si",
                    isActive: true,
                  }
                );
              }

              return Array.from({ length: parseInt(item.cantidad, 10) || 1 }, () => ({
                isActive: true,
                uses: parseInt(item.usos, 10) || 0,
                ownerId: 1, // Asignando por defecto al ownerId 1
                categoryId: category.id,
              }));
            })
          );

          // Aplanamos el array y creamos los ítems en la base de datos
          const flatItems = itemsToCreate.flat();
          
         await Item.bulkCreate(flatItems);


          // Eliminar el archivo después de procesarlo
          fs.unlinkSync(req.file.path);

          return res.status(201).json({
            message: "Items subidos con éxito",
            items: flatItems,
          });
        } catch (error) {
          console.error("Error al guardar los items:", error);
          return res.status(500).json({ message: "Error al guardar los items", error });
        }
      });
  } catch (error) {
    console.error("Error en la carga del archivo:", error);
    return res.status(500).json({ message: "Error en la carga del archivo", error });
  }
};
// export const fixItems = async (req:any, res:any) => {

// }
export const updateItem = async (req: Request | any, res: Response | any) => {
  const { id } = req.params;
  const { code, isActive, uses, categoryId } = req.body;

  try {
    // Buscar el ítem por su ID
    const item = await Item.findByPk(id);

    if (!item) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }

    // Crear un objeto con solo las propiedades definidas en el body
    const updatedFields: any = {};

    // Añadir solo los campos que estén presentes en el body
    if (code !== undefined) updatedFields.code = code;
    if (isActive !== undefined) updatedFields.isActive = isActive;
    if (uses !== undefined) updatedFields.uses = uses;
    if (categoryId !== undefined) updatedFields.categoryId = categoryId;

    // Actualizar solo las propiedades que están presentes
    await item.update(updatedFields);

    return res.status(200).json(item);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error al actualizar el ítem' });
  }
};