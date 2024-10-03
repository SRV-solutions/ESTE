import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import { User } from './user';

export class Role extends Model {
  public id!: number;
  public name!: string;
}

Role.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'roles',
});

Role.hasMany(User, {
  foreignKey: 'roleId',
});
User.belongsTo(Role, {
  foreignKey: 'roleId',
});
