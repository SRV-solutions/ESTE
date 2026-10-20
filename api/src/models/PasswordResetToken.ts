import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/** Link de un solo uso para elegir una contraseña nueva. Se guarda el hash, nunca el token. */
class PasswordResetToken extends Model {
  declare id: number;
  declare userId: number;
  declare tokenHash: string;
  declare expiresAt: Date;
  declare usedAt: Date | null;
}

PasswordResetToken.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    tokenHash: { type: DataTypes.CHAR(64), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'PasswordResetToken', tableName: 'PasswordResetToken', timestamps: true, updatedAt: false },
);

export default PasswordResetToken;
