import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Configuración de Sequelize
import ServiceOrder from './ServiceOrder'; // Modelo ServiceOrder
import Item from './Item'; // Modelo Item

class ServiceOrderItem extends Model {
  public id!: number;
  public serviceOrderId!: number;
  public itemId!: number;
  public isActive!: boolean; // Agregado el tipo para isActive
  public Item!: Item; // Asociación para el modelo Item

  // Método para definir asociaciones
  public static associate() {
    ServiceOrderItem.belongsTo(ServiceOrder, { foreignKey: 'serviceOrderId' });
    ServiceOrderItem.belongsTo(Item, { foreignKey: 'itemId' });
  }
}

ServiceOrderItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    serviceOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false, // Importante para asegurar que este campo no sea nulo
      references: {
        model: 'ServiceOrder', // Nombre de la tabla referenciada
        key: 'id', // Clave primaria de la tabla referenciada
      },
    },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false, // Asegurar no nulo
      references: {
        model: 'Item', // Nombre de la tabla referenciada
        key: 'id', // Clave primaria de la tabla referenciada
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false, // Asegurar no nulo para mayor control
      defaultValue: true, // Asignar un valor por defecto
    },
  },
  {
    sequelize,
    modelName: 'ServiceOrderItem',
    tableName: 'ServiceOrderItem', // Asegúrate de que este nombre coincida con tu base de datos
    timestamps: false, // Desactiva createdAt y updatedAt si no son necesarios
  }
);

// Exportar el modelo
export default ServiceOrderItem;
