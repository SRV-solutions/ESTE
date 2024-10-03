import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { Role } from './role';

export class User extends Model {
  public id!: number;
  public username!: string;
  public roleId!: number;
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  roleId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'roles',
      key: 'id',
    },
  },
}, {
  sequelize,
  tableName: 'users',
});
