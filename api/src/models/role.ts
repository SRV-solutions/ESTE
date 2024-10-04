import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import User from './User';

class Role extends Model {
  public id!: number;
  public roleName!: string;

  public static associate() {
    Role.hasMany(User, { foreignKey: 'roleId'});
  }
}

Role.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  roleName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Role',
  tableName: 'Role',
  timestamps: false,
});

export default Role;
