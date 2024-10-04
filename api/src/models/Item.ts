import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import User from './User'; // Asegúrate de importar el modelo User
import OrderItem from './OrderItem'; // Asegúrate de importar el modelo OrderItem
import ServiceOrderStoreItem from './ServiceOrderStoreItem'; // Asegúrate de importar el modelo ServiceOrderStoreItem

class Item extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public type!: string;
  public cant!: number;
  public unity!: string;
  public value!: number;
  public weight!: number;
  public isStorable!: boolean;
  public uses!: number;
  public ownerId!: number;

  public static associate() {
    Item.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
    Item.hasMany(OrderItem, { foreignKey: 'itemId', as: 'orderItems' });
    Item.hasMany(ServiceOrderStoreItem, { foreignKey: 'itemIdParent', as: 'parentStoreItems' });
    Item.hasMany(ServiceOrderStoreItem, { foreignKey: 'itemIdChild', as: 'childStoreItems' });
  }
}

Item.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cant: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  unity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  isStorable: {
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
  },
}, {
  sequelize,
  modelName: 'Item',
  tableName: 'Item', // Cambié a 'items' para seguir la convención de nombres
  timestamps: false, // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default Item;
