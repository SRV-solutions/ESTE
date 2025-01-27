import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import Location from './Location';
import ServiceOrder from './ServiceOrder';

class Event extends Model {
  public id!: number;
  public eventName!: string;
  public dateEvent!: Date;
  public locationId!: number;
  public organizer!: string;
  public producer!: string;
  public finalClient!: string;

  public static associate() {
    Event.belongsTo(Location, { foreignKey: 'locationId' });
    Event.hasOne(ServiceOrder, { foreignKey: 'eventId', as: 'Event' });
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
      model: 'Location',
      key: 'id',
    },
  },
  organizer: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  producer: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  finalClient: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Event',
  tableName: 'Event',
  timestamps: false,
});

export default Event;
