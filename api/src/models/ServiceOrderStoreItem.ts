import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Item from './Item';

/** Ítem guardado dentro de un contenedor solo para una orden (contenido temporal del baúl). */
class ServiceOrderStoreItem extends Model {
  declare id: number;
  declare serviceOrderId: number;
  declare itemIdParent: number;
  declare itemIdChild: number;
  declare isActive: boolean;
  declare Child?: Item;
}

ServiceOrderStoreItem.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    serviceOrderId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'ServiceOrder', key: 'id' } },
    itemIdParent: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Item', key: 'id' } },
    itemIdChild: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Item', key: 'id' } },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, modelName: 'ServiceOrderStoreItem', tableName: 'ServiceOrderStoreItem', timestamps: false },
);

export default ServiceOrderStoreItem;
