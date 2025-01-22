import { Model, DataTypes } from 'sequelize';
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
  const categories = await Category.findAll({
    where: { id: items.map((item) => item.categoryId) },
  });

  const categoryMap = new Map(categories.map((c) => [c.id, c.code]));

  const updates = items.map((item) => ({
    id: item.id,
    code: `${categoryMap.get(item.categoryId)}-${item.id}`,
  }));

  await Promise.all(
    updates.map(({ id, code }) =>
      Item.update({ code }, { where: { id } })
    )
  );
});



Item.afterCreate(async (item) => {
  console.log(item);

  const category = await Category.findByPk(item.categoryId);
  if (category) {
    item.code = `${category.code}-${item.id}`;
    await item.save(); // Guardamos el código actualizado
  }
});

export default Item;
