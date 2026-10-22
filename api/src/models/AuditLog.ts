import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Registro de auditoría. `kind` agrupa para filtrar:
 * login · login_failed · logout · change · security · download.
 */
export type AuditKind = 'login' | 'login_failed' | 'logout' | 'change' | 'security' | 'download';

class AuditLog extends Model {
  declare id: number;
  declare companyId: number | null;
  declare userId: number | null;
  declare username: string | null;
  declare kind: AuditKind;
  declare action: string;
  declare summary: string;
  declare method: string | null;
  declare path: string | null;
  declare status: number | null;
  declare ip: string | null;
  declare userAgent: string | null;
  declare meta: Record<string, unknown> | null;
  declare createdAt: Date;
}

AuditLog.init(
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    username: { type: DataTypes.STRING, allowNull: true },
    kind: { type: DataTypes.STRING(16), allowNull: false },
    action: { type: DataTypes.STRING(80), allowNull: false },
    summary: { type: DataTypes.STRING(300), allowNull: false },
    method: { type: DataTypes.STRING(8), allowNull: true },
    path: { type: DataTypes.STRING(300), allowNull: true },
    status: { type: DataTypes.SMALLINT, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    userAgent: { type: DataTypes.STRING(300), allowNull: true },
    meta: { type: DataTypes.JSONB, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, modelName: 'AuditLog', tableName: 'AuditLog', timestamps: true, updatedAt: false },
);

export default AuditLog;
