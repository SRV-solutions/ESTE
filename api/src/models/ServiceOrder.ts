import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import Event from './Event'; // Asegúrate de importar el modelo Event
import User from './User'; // Asegúrate de importar el modelo Event
import ServiceOrderItem from './ServiceOrderItem'; // Asegúrate de importar el modelo OrderItem
import ServiceOrderStoreItem from './ServiceOrderStoreItem';

export enum ServiceOrderStatus {
  Created = 'created', //se puede editar - solo el que la crea  // Fiama o alguien crea lo necesario para algún evento
  InReview = 'in_review', // Entra en una espera para que alguien revise la orden
  Approved = 'approved', //se puede editar - solo el que la arma // Alguien del staff chequea y aprueba la Orden de Servicio
  Rejected = 'rejected', // Alguien del staff chequea y rechaza la Orden de Servicio
  InProcess = 'in_process', //se puede editar - solo el que la arma // Claudio o alguien en el depósito arma los ítems necesarios
  Ready = 'ready', // La orden ya está armada y lista para ser cargada
  Dispatched = 'dispatched', // La Orden fue despachada con éxito
  Delivered = 'delivered', // La Orden fue entregada al lugar del evento
  Returning = 'returning', // La Orden está en viaje, mayormente hacia el depósito
  Received = 'received', // La orden fue recibida con éxito en el depósito
  UnderReview = 'under_review', // La Orden de Servicio debe ser revisada para chequear los materiales
  Disassembled = 'disassembled', // La Orden fue desarmada y cada ítem fue devuelto a su lugar
}

class ServiceOrder extends Model {
  public id!: number;
  public eventId!: number;
  public createdDate!: Date;
  public incomeDate!: Date;
  public outcomeDate!: Date;
  public assemblyDate !: Date;
  public disassemblyDate !: Date;
  public status!: ServiceOrderStatus;
  public observations!: string;
  public checkedBy!: number;
  public orderBy!: number;
  public deployedBy!: number;
  public ServiceOrderItems!: Array<ServiceOrderItem>
  public DeployedBy!: User
  public OrderedBy!: User
  public CheckedBy!: User
  public Event!: Event

  public static associate() {
    ServiceOrder.belongsTo(User, { foreignKey: 'deployedBy', as: 'DeployedBy' });
    ServiceOrder.belongsTo(User, { foreignKey: 'checkedBy', as: 'CheckedBy' });
    ServiceOrder.belongsTo(User, { foreignKey: 'orderedBy', as: 'OrderedBy' });
    ServiceOrder.belongsTo(Event, { foreignKey: 'eventId', as: 'Event' });


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
  orderedBy: {
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
    type: DataTypes.DATEONLY, // Solo la fecha sin hora
    allowNull: false,
  },
  incomeDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  outcomeDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  assemblyDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  disassemblyDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM(...Object.values(ServiceOrderStatus)),
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
