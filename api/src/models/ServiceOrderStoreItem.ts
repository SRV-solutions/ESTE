import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';
import ServiceOrder from './ServiceOrder';
import Item from './Item';

class ServiceOrderStoreItem extends Model {
  public id!: number;
  public serviceOrderId!: number;  // Relación con ServiceOrder
  public itemIdParent!: number;    // Relación con el ítem padre
  public itemIdChild!: number;     // Relación con el ítem hijo
  public isActive!: boolean;       // Nuevo campo para activar/desactivar el ítem

  public static associate() {
    ServiceOrderStoreItem.belongsTo(ServiceOrder, { foreignKey: 'serviceOrderId' });
    ServiceOrderStoreItem.belongsTo(Item, { foreignKey: 'itemIdParent', as: 'ServiceOrderStoreItemParent' });
    ServiceOrderStoreItem.belongsTo(Item, { foreignKey: 'itemIdChild', as: 'ServiceOrderStoreItemChild' });
  }
}

ServiceOrderStoreItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    serviceOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ServiceOrder', // Nombre de la tabla referenciada
        key: 'id',             // Clave primaria de la tabla referenciada
      },
    },
    itemIdParent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Item',         // Nombre de la tabla referenciada
        key: 'id',             // Clave primaria de la tabla referenciada
      },
    },
    itemIdChild: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Item',         // Nombre de la tabla referenciada
        key: 'id',             // Clave primaria de la tabla referenciada
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,      // Valor predeterminado
    },
  },
  {
    sequelize,
    modelName: 'ServiceOrderStoreItem',
    tableName: 'ServiceOrderStoreItem',
    timestamps: false, // Cambia a true si necesitas timestamps
  }
);

export default ServiceOrderStoreItem;
