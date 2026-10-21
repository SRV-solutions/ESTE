import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Company from './Company';
import type Employee from './Employee';
import type Role from './Role';

/** app: entra y cuenta para el plan · temporary: entra hasta accessUntil · none: no entra (solo personal). */
export type UserAccess = 'app' | 'temporary' | 'none';

/** Si la persona puede entrar ahora a Event Box. */
export const hasLogin = (u: { access: UserAccess; accessUntil: Date | null; disabledAt?: Date | null }) =>
  !u.disabledAt && (u.access === 'app' || (u.access === 'temporary' && !!u.accessUntil && new Date(u.accessUntil) > new Date()));

class User extends Model {
  declare id: number;
  declare companyId: number | null;
  declare isSuperAdmin: boolean;
  /** Null solo en personas sin acceso a la app. */
  declare username: string;
  declare email: string | null;
  /** DNI sin puntos: sirve para entrar, igual que el usuario o el email. */
  declare dni: string | null;
  declare password: string;
  declare access: UserAccess;
  declare accessUntil: Date | null;
  /** Desactivado: no entra ni cuenta para el plan, pero conserva su historial. */
  declare disabledAt: Date | null;
  declare firstname: string | null;
  declare lastname: string | null;
  declare roleId: number;
  declare avatarUrl: string | null;
  declare Role?: Role;
  declare Company?: Company;
  declare Employee?: Employee;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Company', key: 'id' } },
    isSuperAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    username: { type: DataTypes.STRING, allowNull: true, unique: true },
    email: { type: DataTypes.STRING, allowNull: true, unique: true },
    dni: { type: DataTypes.STRING(10), allowNull: true },
    password: { type: DataTypes.STRING, allowNull: true },
    access: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'app' },
    accessUntil: { type: DataTypes.DATE, allowNull: true },
    disabledAt: { type: DataTypes.DATE, allowNull: true },
    firstname: { type: DataTypes.STRING, allowNull: true },
    lastname: { type: DataTypes.STRING, allowNull: true },
    roleId: { type: DataTypes.INTEGER, references: { model: 'Role', key: 'id' } },
    avatarUrl: { type: DataTypes.STRING(500), allowNull: true },
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
