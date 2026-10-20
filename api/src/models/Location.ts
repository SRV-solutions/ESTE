import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

class Location extends Model {
  declare id: number;
  declare companyId: number;
  declare locationName: string;
  declare address: string;
  declare city: string;
  declare country: string;
}

Location.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Company', key: 'id' } },
    locationName: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: 'Location', tableName: 'Location', timestamps: false },
);

export default Location;
