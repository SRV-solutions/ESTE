import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import bcrypt from 'bcrypt';
import Role from './Role';
import ServiceOrder from './ServiceOrder';

class User extends Model {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string; // Campo para almacenar la contraseña
  public roleId!: number;
  public Role!: Role
  // Asociaciones con otros modelos
  public static associate() {
    User.belongsTo(Role, { foreignKey: 'roleId' });
    User.hasMany(ServiceOrder, { foreignKey: 'checkedBy', as: 'CheckedBy' });
    User.hasMany(ServiceOrder, { foreignKey: 'deployedBy', as: 'DeployedBy' });
    User.hasMany(ServiceOrder, { foreignKey: 'orderedBy', as: 'OrderedBy' });
  }
}

User.init(
  {
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
    password: {
      type: DataTypes.STRING,
      allowNull: false, // Contraseña es obligatoria
    },
    roleId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Role',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'User',
    timestamps: false,
    hooks: {
      // Hashear la contraseña antes de crear un usuario
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      // Hashear la contraseña si se actualiza
      beforeUpdate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

export default User;
