import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Company from './Company';
import type User from './User';

export const FEEDBACK_TYPES = ['error', 'sugerencia', 'consulta'] as const;

/** Reporte de un problema (o sugerencia) que un usuario manda desde la app al equipo de SRV. */
class Feedback extends Model {
  declare id: number;
  declare companyId: number | null;
  declare userId: number | null;
  declare type: (typeof FEEDBACK_TYPES)[number];
  declare message: string;
  declare pageUrl: string | null;
  declare userAgent: string | null;
  declare attachmentUrl: string | null;
  declare status: 'open' | 'resolved';
  declare resolvedAt: Date | null;
  declare createdAt: Date;
  declare Company?: Company;
  declare User?: User;
}

Feedback.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    type: { type: DataTypes.STRING(16), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    pageUrl: { type: DataTypes.STRING(500), allowNull: true },
    userAgent: { type: DataTypes.STRING(300), allowNull: true },
    attachmentUrl: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'open' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'Feedback', tableName: 'Feedback', timestamps: true },
);

export default Feedback;
