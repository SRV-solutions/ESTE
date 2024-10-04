import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database'; // Asegúrate de tener la configuración de Sequelize
import Event from './Event';

class Location extends Model {
  public id!: number;
  public locationName!: string;
  public address!: string;
  public city!: string;
  public country!: string;

  // Método para definir asociaciones
  public static associate() {
    Location.hasMany(Event, { foreignKey: 'locationId', as: 'events' });
  }
}

Location.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  locationName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Location',
  tableName: 'Location', // Cambié a 'locations' para seguir la convención de nombres
  timestamps: false,      // Si no tienes createdAt y updatedAt
});

// Exportar el modelo
export default Location;
