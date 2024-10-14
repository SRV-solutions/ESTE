import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import Item from './Item';


class Category extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  public type!: string;
  public quantity!: number;
  public unity!: string;
  public value!: number;
  public weight!: number;
  public isStorable!: boolean;
  public isContainer!: boolean;
  public isActive!: boolean;

  public static associate() {
    Category.hasMany(Item, { foreignKey: 'categoryId'})
  }
}

Category.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
  quantity: {
    type: DataTypes.INTEGER,
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
  tableName: 'Category', // Cambié a 'items' para seguir la convención de nombres
  timestamps: false, // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default Category;
