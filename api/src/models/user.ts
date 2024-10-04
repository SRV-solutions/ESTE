import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import Role from './Role';
import ServiceOrder from './ServiceOrder';

class User extends Model {
  public id!: number;
  public username!: string;
  public email!: string;
  public roleId!: number;

  public static associate() {
    User.belongsTo(Role, { foreignKey: 'roleId'});
    User.hasMany(ServiceOrder, { foreignKey: 'checkedBy'});
    User.hasMany(ServiceOrder, { foreignKey: 'deployedBy'});
    User.hasMany(ServiceOrder, { foreignKey: 'orderBy'});
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
