import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import Event from './Event'; // Asegúrate de importar el modelo Event
import User from './User'; // Asegúrate de importar el modelo Event
import ServiceOrderItem from './ServiceOrderItem'; // Asegúrate de importar el modelo OrderItem
import ServiceOrderStoreItem from './ServiceOrderStoreItem';

enum Status {
  "Creada",
  "En Revision",
  "Abrobada",
  "Rechazada",
  "En Proceso",
  "Lista",
  "Despachada",
  "Entregada",
  "Vuelta",
  "Recibida",
  "Desarmada"
}

class ServiceOrder extends Model {
  public id!: number;
  public eventId!: number;
  public createdDate!: Date;
  public status!: Status;
  public observations!: string;
  public checkedBy!: number;
  public orderBy!: number;
  public deployedBy!: number;
  public ServiceOrderItems!: Array<ServiceOrderItem>

  public static associate() {
    ServiceOrder.belongsTo(User, { foreignKey: 'checkedBy' });
    ServiceOrder.belongsTo(User, { foreignKey: 'deployedBy' });
    ServiceOrder.belongsTo(User, { foreignKey: 'orderBy' });
    ServiceOrder.belongsTo(Event, { foreignKey: 'eventId' });

    ServiceOrder.hasMany(ServiceOrderItem, { foreignKey: 'serviceOrderId' });
    ServiceOrder.hasOne(ServiceOrderStoreItem, { foreignKey: 'serviceOrderId' })
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
  orderBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'User', // Nombre de la tabla referenciada
      key: 'id',      // Clave primaria de la tabla referenciada
    },
  },
  deployedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'User', // Nombre de la tabla referenciada
      key: 'id',      // Clave primaria de la tabla referenciada
    },
  },
  checkedBy: {
    type: DataTypes.INTEGER,
    references: {
      model: 'User', // Nombre de la tabla referenciada
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
