import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import Role from './Role';
import RolePermission from './RolePermission';

class Permission extends Model {
  public id!: number;
  public entidad!: string;
  public accion!: string;

  public static associate() {
    Permission.belongsToMany(Role, {
      through: RolePermission,
      foreignKey: 'permissionId',
      otherKey: 'roleId',
    });
  }
}

Permission.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  entidad: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Permission',
  tableName: 'Permission',
  timestamps: false,
});

export default Permission;
