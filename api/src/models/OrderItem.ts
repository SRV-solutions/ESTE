import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import ServiceOrder from './ServiceOrder'; // Asegúrate de importar el modelo ServiceOrder
import Item from './Item'; // Asegúrate de importar el modelo Item

class OrderItem extends Model {
  public id!: number;
  public serviceOrderId!: number;
  public itemId!: number;
  public quantity!: number;

  // Método para definir asociaciones
  public static associate() {
    OrderItem.belongsTo(ServiceOrder, { foreignKey: 'serviceOrderId', as: 'serviceOrder' });
    OrderItem.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
  }
}

OrderItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  serviceOrderId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'ServiceOrder', // Nombre de la tabla referenciada
      key: 'id',             // Clave primaria de la tabla referenciada
    },
  },
  itemId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Item', // Nombre de la tabla referenciada
      key: 'id',     // Clave primaria de la tabla referenciada
    },
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'OrderItem',
  tableName: 'OrderItem', // Cambié a 'order_items' para seguir la convención de nombres
  timestamps: false, // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default OrderItem;
