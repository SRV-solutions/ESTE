import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import User from './User'; // Asegúrate de importar el modelo User
import ServiceOrderItem from './ServiceOrderItem'; // Asegúrate de importar el modelo OrderItem
import ServiceOrderStoreItem from './ServiceOrderStoreItem'; // Asegúrate de importar el modelo ServiceOrderStoreItem
import StoreItem from './StoreItem';
import Category from './Category';

class Item extends Model {
  public id!: number;
  public isActive!: boolean;
  public uses!: number;
  public ownerId!: number;
  public Category!: Category

  public static associate() {
    Item.belongsTo(User, { foreignKey: 'ownerId'});
    Item.belongsTo(Category, { foreignKey: 'categoryId'});
    Item.hasMany(ServiceOrderItem, { foreignKey: 'itemId'});
    Item.hasMany(ServiceOrderStoreItem, { foreignKey: 'itemIdParent', as: 'ParentItem' });
    Item.hasMany(ServiceOrderStoreItem, { foreignKey: 'itemIdChild', as: 'ChildItem' });
    Item.hasMany(StoreItem, { foreignKey: 'itemIdParent' });
    Item.hasMany(StoreItem, { foreignKey: 'itemIdChild' });

  }
}

Item.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
      model: 'User', // Nombre de la tabla referenciada
      key: 'id',     // Clave primaria de la tabla referenciada
    },
  },categoryId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Category', // Nombre de la tabla referenciada
      key: 'id',     // Clave primaria de la tabla referenciada
    },
  },
}, {
  sequelize,
  modelName: 'Item',
  tableName: 'Item', // Cambié a 'items' para seguir la convención de nombres
  timestamps: false, // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default Item;
