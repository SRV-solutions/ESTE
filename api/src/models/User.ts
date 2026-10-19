import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Company from './Company';
import type Role from './Role';

class User extends Model {
  declare id: number;
  declare companyId: number | null;
  declare isSuperAdmin: boolean;
  declare username: string;
  declare email: string;
  declare password: string;
  declare firstname: string | null;
  declare lastname: string | null;
  declare roleId: number;
  declare Role?: Role;
  declare Company?: Company;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Company', key: 'id' } },
    isSuperAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    firstname: { type: DataTypes.STRING, allowNull: true },
    lastname: { type: DataTypes.STRING, allowNull: true },
    roleId: { type: DataTypes.INTEGER, references: { model: 'Role', key: 'id' } },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'User',
    timestamps: false,
    // El hash nunca sale en una respuesta: solo el login lo pide explícitamente.
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: { include: ['password'] } } },
  },
);

export default User;
