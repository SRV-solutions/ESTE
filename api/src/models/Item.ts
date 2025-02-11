import { Model, DataTypes, Op } from 'sequelize';
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

Item.afterBulkCreate(async (items) => {
  try {
    if (!items.length) return; // Si no hay ítems, salir

    const categoryId = items[0].categoryId;

    // Obtener la categoría
    const category = await Category.findOne({ where: { id: categoryId } });
    if (!category) {
      console.error(`❌ Categoría con ID ${categoryId} no encontrada.`);
      return;
    }

    const lastItem = await Item.findOne({
      where: { categoryId, code: { [Op.ne]: null } },
      order: [['id', 'DESC']],
      attributes: ['code'],
    });

    let highestCode = 0;
    if (lastItem && lastItem.code) {
      const parts = lastItem.code.split('-');
      const lastNumber = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNumber)) highestCode = lastNumber;
    }

    const updates = items.map((item, i) => ({
      id: item.id,
      code: `${category.code}-${highestCode + i + 1}`,
    }));

    await Promise.all(
      updates.map(({ id, code }) =>
        Item.update({ code }, { where: { id } })
      )
    );
  } catch (error) {
    console.error("🚨 Error en afterBulkCreate:", error);
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
