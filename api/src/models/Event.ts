import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Location from './Location';

class Event extends Model {
  declare id: number;
  declare companyId: number;
  declare eventName: string;
  declare dateEvent: Date;
  declare locationId: number;
  declare organizer: string;
  declare producer: string;
  declare finalClient: string;
  declare Location?: Location;
}

Event.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Company', key: 'id' } },
    eventName: { type: DataTypes.STRING, allowNull: false },
    dateEvent: { type: DataTypes.DATE, allowNull: false },
    locationId: { type: DataTypes.INTEGER, references: { model: 'Location', key: 'id' } },
    organizer: { type: DataTypes.STRING, allowNull: false },
    producer: { type: DataTypes.STRING, allowNull: false },
    finalClient: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Event', tableName: 'Event', timestamps: false },
);

export default Event;
