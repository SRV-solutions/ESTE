import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type ServiceOrder from './ServiceOrder';
import type User from './User';

export type CheckInKind = 'in' | 'out';

/**
 * Check-in (el material llegó al evento) o check-out (se retiró), con la ubicación del teléfono.
 * `onSite` dice si estaba dentro del radio del lugar del evento; `distanceM` cuánto se alejó.
 */
class CheckIn extends Model {
  declare id: number;
  declare companyId: number;
  declare serviceOrderId: number;
  declare userId: number | null;
  declare kind: CheckInKind;
  declare lat: number | null;
  declare lng: number | null;
  declare accuracy: number | null;
  declare distanceM: number | null;
  declare onSite: boolean;
  declare note: string | null;
  declare createdAt: Date;
  declare ServiceOrder?: ServiceOrder;
  declare User?: User;
}

CheckIn.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    serviceOrderId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    kind: { type: DataTypes.STRING(3), allowNull: false },
    lat: { type: DataTypes.DOUBLE, allowNull: true },
    lng: { type: DataTypes.DOUBLE, allowNull: true },
    accuracy: { type: DataTypes.FLOAT, allowNull: true },
    distanceM: { type: DataTypes.INTEGER, allowNull: true },
    onSite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    note: { type: DataTypes.STRING(500), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'CheckIn', tableName: 'CheckIn', timestamps: true, updatedAt: false },
);

export default CheckIn;
