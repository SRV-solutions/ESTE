import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import Event from './Event'; // Asegúrate de importar el modelo Event
import OrderItem from './OrderItem'; // Asegúrate de importar el modelo OrderItem

class ServiceOrder extends Model {
  public id!: number;
  public eventId!: number;
  public createdDate!: Date;
  public status!: string;
  public observations!: string;

  // Método para definir asociaciones
  public static associate() {
    ServiceOrder.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
    ServiceOrder.hasMany(OrderItem, { foreignKey: 'serviceOrderId', as: 'orderItems' });
  }
}

ServiceOrder.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  eventId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Event', // Nombre de la tabla referenciada
      key: 'id',      // Clave primaria de la tabla referenciada
    },
  },
  createdDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  observations: {
    type: DataTypes.STRING,
    allowNull: true, // Puedes hacer esto opcional si no es obligatorio
  },
}, {
  sequelize,
  modelName: 'ServiceOrder',
  tableName: 'ServiceOrder', // Cambié a 'service_orders' para seguir la convención de nombres
  timestamps: false, // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default ServiceOrder;
