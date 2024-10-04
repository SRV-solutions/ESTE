import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import Role from './Role';

class User extends Model {
  public id!: number;
  public username!: string;
  public email!: string;
  public roleId!: number;

  public static associate() {
    User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  roleId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Role',
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'User',
  timestamps: false,
});

export default User;
