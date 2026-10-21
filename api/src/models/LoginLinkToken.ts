import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/** Link de un solo uso (5 minutos) que entra directo en otro dispositivo: lo genera una sesión abierta. */
class LoginLinkToken extends Model {
  declare id: number;
  declare userId: number;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;
}

LoginLinkToken.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    tokenHash: { type: DataTypes.STRING(64), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'LoginLinkToken', tableName: 'LoginLinkToken', timestamps: true, updatedAt: false },
);

export default LoginLinkToken;
