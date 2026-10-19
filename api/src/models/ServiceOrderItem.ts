import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Item from './Item';

/** Ítem cargado directamente en una orden de servicio. */
class ServiceOrderItem extends Model {
  declare id: number;
  declare serviceOrderId: number;
  declare itemId: number;
  declare isActive: boolean;
  declare Item?: Item;
}

ServiceOrderItem.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    serviceOrderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'ServiceOrder', key: 'id' } },
    itemId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Item', key: 'id' } },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, modelName: 'ServiceOrderItem', tableName: 'ServiceOrderItem', timestamps: false },
);

export default ServiceOrderItem;
