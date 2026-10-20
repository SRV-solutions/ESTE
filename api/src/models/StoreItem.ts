import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Item from './Item';

/** Contenido fijo de un contenedor: el ítem hijo viaja siempre dentro del padre. */
class StoreItem extends Model {
  declare id: number;
  declare itemIdParent: number;
  declare itemIdChild: number;
  declare Child?: Item;
}

StoreItem.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    itemIdParent: { type: DataTypes.INTEGER, references: { model: 'Item', key: 'id' } },
    itemIdChild: { type: DataTypes.INTEGER, references: { model: 'Item', key: 'id' } },
  },
  { sequelize, modelName: 'StoreItem', tableName: 'StoreItem', timestamps: false },
);

export default StoreItem;
