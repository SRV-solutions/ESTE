import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type User from './User';

/**
 * Ficha laboral de un usuario de la empresa (el personal son los usuarios).
 * El nombre y el email salen del usuario. Se crea la primera vez que se completa o se le carga un recibo.
 */
class Employee extends Model {
  declare id: number;
  declare companyId: number;
  declare userId: number;
  declare cuil: string | null;
  declare position: string | null;
  declare area: string | null;
  declare startDate: string | null;
  declare phone: string | null;
  declare isActive: boolean;
  declare User?: User;
}

Employee.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    cuil: { type: DataTypes.STRING(11), allowNull: true },
    position: { type: DataTypes.STRING(120), allowNull: true },
    area: { type: DataTypes.STRING(120), allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    phone: { type: DataTypes.STRING(60), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, modelName: 'Employee', tableName: 'Employee', timestamps: true },
);

export default Employee;
