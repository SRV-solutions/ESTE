import { Model, DataTypes, Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';
import ServiceOrderItem from './ServiceOrderItem';
import ServiceOrderStoreItem from './ServiceOrderStoreItem';
import StoreItem from './StoreItem';
import Category from './Category';

class Item extends Model {
  public id!: number;
  public code!: string;
  public isActive!: boolean;
  public uses!: number;
  public ownerId!: number;
  public categoryId!: number;
  public Category!: Category;
  public StoreItemParent!: Array<any>

  public static associate() {
    Item.belongsTo(User, { foreignKey: 'ownerId' });
    Item.belongsTo(Category, { foreignKey: 'categoryId' });
    Item.hasMany(ServiceOrderItem, { foreignKey: 'itemId' });
    Item.hasMany(ServiceOrderStoreItem, { foreignKey: 'itemIdParent', as: 'ServiceOrderStoreItemParent' });
    Item.hasMany(ServiceOrderStoreItem, { foreignKey: 'itemIdChild', as: 'ServiceOrderStoreItemChild' });
    Item.hasMany(StoreItem, { foreignKey: 'itemIdParent', as: 'StoreItemParent' });
    Item.hasMany(StoreItem, { foreignKey: 'itemIdChild', as: 'StoreItemChild' });
  }
}

Item.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true, // Se generará después de la inserción
    unique: true, // Asegura que no haya códigos duplicados
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  uses: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ownerId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'User',
      key: 'id',
    },
  },
  categoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Category',
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'Item',
  tableName: 'Item',
  timestamps: false,
});

Item.afterBulkCreate(async (items, options) => {
  if (!items.length) return; // Si no hay ítems, salir
  
  const transaction:any = await Item.sequelize?.transaction();
  
  try {
    const categoriesId = [...new Set(items.map(item => item.categoryId))];

    // Obtener categorías dentro de la transacción
    const categories = await Category.findAll({
      where: { id: categoriesId },
      transaction
    });

    if (!categories.length) {
      console.error(`❌ Categoría(s) con ID ${categoriesId} no encontrada(s).`);
      await transaction.rollback();
      return;
    }

    // Obtener los últimos códigos de cada categoría existentes en la DB
    const lastItems = await Item.findAll({
      where: { categoryId: categoriesId, code: { [Op.ne]: null } },
      attributes: ['categoryId', 'code'],
      order: [['categoryId', 'ASC'], ['id', 'DESC']], // Obtener el último por categoría
      transaction
    });

    const highestCodesByCategory: Record<number, number> = {};

    // Determinar el último número por categoría
    for (const item of lastItems) {
      const category = categories.find(c => c.id === item.categoryId);
      if (!category) continue;

      const regex = new RegExp(`^${category.code}-(\\d+)$`);
      const match = item.code.match(regex);

      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
          highestCodesByCategory[item.categoryId] = Math.max(
            highestCodesByCategory[item.categoryId] || 0,
            num
          );
        }
      }
    }

    // Asignar nuevos códigos a los items creados
    const updates = items.map((item) => {
      const category = categories.find(c => c.id === item.categoryId);
      if (!category) return null;

      // Obtener el último código asignado y calcular el siguiente
      const lastCode = highestCodesByCategory[item.categoryId] || 0;
      highestCodesByCategory[item.categoryId] = lastCode + 1;

      return {
        id: item.id,
        code: `${category.code}-${highestCodesByCategory[item.categoryId]}`
      };
    }).filter(Boolean); // Eliminar valores nulos

    // Actualizar los ítems con los nuevos códigos
    await Promise.all(
      updates.map(({ id, code }: any) =>
        Item.update({ code }, { where: { id }, transaction })
      )
    );

    await transaction.commit();
  } catch (error) {
    console.error("🚨 Error en afterBulkCreate:", error);
    await transaction?.rollback();
  }
});


Item.afterCreate(async (item) => {
  try {
    const category = await Category.findByPk(item.categoryId);
    if (!category) {
      console.error(`❌ Categoría con ID ${item.categoryId} no encontrada.`);
      return;
    }

    // Obtener el código más alto en la categoría
    const lastItem = await Item.findOne({
      where: { categoryId: item.categoryId, code: { [Op.ne]: null } },
      order: [['id', 'DESC']], // Ordenar por ID descendente para obtener el último creado
      attributes: ['code'],
    });

    let highestCode = 0;
    if (lastItem && lastItem.code) {
      const parts = lastItem.code.split('-');
      const lastNumber = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNumber)) highestCode = lastNumber;
    }

    // Asignar el nuevo código y guardar
    item.code = `${category.code}-${highestCode + 1}`;
    await item.save();
  } catch (error) {
    console.error("🚨 Error en afterCreate:", error);
  }
});

export default Item;
