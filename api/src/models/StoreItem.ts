import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import Item from './Item'; // Asegúrate de importar el modelo Item

class StoreItem extends Model {
  public id!: number;
  public itemIdParent!: number;
  public itemIdChild!: number;
  
  // Método para definir asociaciones
  public static associate() {
    StoreItem.belongsTo(Item, { foreignKey: 'itemIdParent'});
    StoreItem.belongsTo(Item, { foreignKey: 'itemIdChild' });
  }
}

StoreItem.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  itemIdParent: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Item', // Nombre de la tabla referenciada
      key: 'id',     // Clave primaria de la tabla referenciada
    },
  },
  itemIdChild: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Item', // Nombre de la tabla referenciada
      key: 'id',     // Clave primaria de la tabla referenciada
    },
  }
}, {
  sequelize,
  modelName: 'StoreItem',
  tableName: 'StoreItem', // Cambié a 'store_items' para seguir la convención de nombres
  timestamps: false, // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default StoreItem;
