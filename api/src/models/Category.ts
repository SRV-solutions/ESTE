import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import Item from './Item';

class Category extends Model {
  public id!: number;
  public code!: string;
  public name!: string;
  public description!: string;
  public type!: string;
  public unity!: string;
  public value!: number;
  public weight!: number;
  public isStorable!: boolean;
  public isContainer!: boolean;
  public isActive!: boolean;

  public static associate() {
    Category.hasMany(Item, { foreignKey: 'categoryId' });
  }
}

Category.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, // Aseguramos que cada categoría tenga un código único
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  unity: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  isStorable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  isContainer: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  }
}, {
  sequelize,
  modelName: 'Category',
  tableName: 'Category',
  timestamps: false,
});

export default Category;
