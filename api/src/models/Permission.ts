import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

class Permission extends Model {
  declare id: number;
  declare entity: string;
  declare action: string;
}

Permission.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    entity: { type: DataTypes.STRING, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Permission', tableName: 'Permission', timestamps: false },
);

export default Permission;
