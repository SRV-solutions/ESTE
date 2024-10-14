import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import Location from './Location';
import ServiceOrder from './ServiceOrder';

class Event extends Model {
  public id!: number;
  public eventName!: string;
  public dateEvent!: Date;
  public locationId!: number;

  public static associate() {
    Event.belongsTo(Location, { foreignKey: 'locationId'});
    Event.hasOne(ServiceOrder, { foreignKey: 'eventId', as: 'Event' })
  }
}

Event.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  eventName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateEvent: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  locationId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Location', // Nombre de la tabla referenciada
      key: 'id',         // Clave primaria de la tabla referenciada
    },
  },
}, {
  sequelize,
  modelName: 'Event',
  tableName: 'Event', // Cambia a 'events' para seguir la convención de nombres
  timestamps: false,    // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default Event;
