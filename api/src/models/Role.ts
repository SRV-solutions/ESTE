import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Permission from './Permission';

class Role extends Model {
  declare id: number;
  declare roleName: string;
  declare description: string | null;
  /** Null: el rol Administrador (global) y las plantillas que se copian a cada empresa nueva. */
  declare companyId: number | null;
  declare Permissions?: Permission[];
}

Role.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    roleName: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
    companyId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: 'Role', tableName: 'Role', timestamps: false },
);

export default Role;
