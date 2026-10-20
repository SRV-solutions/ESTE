import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

class Category extends Model {
  declare id: number;
  declare companyId: number;
  declare code: string;
  declare name: string;
  declare description: string | null;
  declare type: string;
  declare unity: string;
  declare value: number;
  declare weight: number;
  declare isStorable: boolean;
  declare isContainer: boolean;
  declare isActive: boolean;
}

Category.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Company', key: 'id' } },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: false },
    unity: { type: DataTypes.STRING, allowNull: false },
    value: { type: DataTypes.FLOAT, allowNull: false },
    weight: { type: DataTypes.FLOAT, allowNull: false },
    isStorable: { type: DataTypes.BOOLEAN, allowNull: false },
    isContainer: { type: DataTypes.BOOLEAN, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false },
  },
  { sequelize, modelName: 'Category', tableName: 'Category', timestamps: false },
);

export default Category;
