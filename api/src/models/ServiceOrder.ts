import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { ServiceOrderStatus } from './enums';
import type Event from './Event';
import type User from './User';

export { ServiceOrderStatus };

/** Orden de servicio: el pedido de material para un evento, desde que se arma hasta que vuelve al depósito. */
class ServiceOrder extends Model {
  declare id: number;
  declare companyId: number;
  declare eventId: number;
  declare orderedBy: number;
  declare deployedBy: number | null;
  declare checkedBy: number | null;
  declare createdDate: string;
  declare incomeDate: Date | null;
  declare outcomeDate: Date | null;
  declare assemblyDate: Date | null;
  declare disassemblyDate: Date | null;
  declare status: ServiceOrderStatus;
  declare observations: string | null;
  declare Event?: Event;
  declare OrderedBy?: User;
  declare CheckedBy?: User;
  declare DeployedBy?: User;
}

ServiceOrder.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Company', key: 'id' } },
    eventId: { type: DataTypes.INTEGER, references: { model: 'Event', key: 'id' } },
    orderedBy: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'User', key: 'id' } },
    deployedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'User', key: 'id' } },
    checkedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'User', key: 'id' } },
    createdDate: { type: DataTypes.DATEONLY, allowNull: false },
    incomeDate: { type: DataTypes.DATE, allowNull: true },
    outcomeDate: { type: DataTypes.DATE, allowNull: true },
    assemblyDate: { type: DataTypes.DATE, allowNull: true },
    disassemblyDate: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM(...Object.values(ServiceOrderStatus)), allowNull: false },
    observations: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'ServiceOrder', tableName: 'ServiceOrder', timestamps: false },
);

export default ServiceOrder;
