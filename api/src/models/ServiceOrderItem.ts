import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import ServiceOrder from './ServiceOrder'; // Asegúrate de importar el modelo ServiceOrder
import Item from './Item'; // Asegúrate de importar el modelo Item

class ServiceOrderItem extends Model {
  public id!: number;
  public serviceOrderId!: number;
  public itemId!: number;
  public quantity!: number;

  // Método para definir asociaciones
  public static associate() {
    ServiceOrderItem.belongsTo(ServiceOrder, { foreignKey: 'serviceOrderId' });
    ServiceOrderItem.belongsTo(Item, { foreignKey: 'itemId'});
  }
}

ServiceOrderItem.init({
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
  modelName: 'ServiceOrderItem',
  tableName: 'ServiceOrderItem', // Cambié a 'order_items' para seguir la convención de nombres
  timestamps: false, // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default ServiceOrderItem;
