import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Category from './Category';

/** Unidad física del stock. El código (`CAT-12`) lo asigna services/itemCodes al crearlo. */
class Item extends Model {
  declare id: number;
  declare companyId: number;
  declare code: string;
  declare isActive: boolean;
  declare uses: number | null;
  declare ownerId: number | null;
  declare categoryId: number;
  declare Category?: Category;
}

Item.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Company', key: 'id' } },
    code: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false },
    uses: { type: DataTypes.INTEGER, allowNull: true },
    ownerId: { type: DataTypes.INTEGER, references: { model: 'User', key: 'id' } },
    categoryId: { type: DataTypes.INTEGER, references: { model: 'Category', key: 'id' } },
  },
  { sequelize, modelName: 'Item', tableName: 'Item', timestamps: false },
);

export default Item;
