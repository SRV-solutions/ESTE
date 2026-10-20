import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Employee from './Employee';

export const PAYSLIP_KINDS = ['mensual', 'aguinaldo', 'vacaciones', 'liquidacion_final', 'otro'] as const;

/** Recibo de sueldo digital: el PDF lo sube la empresa y el empleado lo firma en conformidad (o no). */
class Payslip extends Model {
  declare id: number;
  declare companyId: number;
  declare employeeId: number;
  declare period: string;
  declare kind: (typeof PAYSLIP_KINDS)[number];
  declare grossAmount: string | null;
  declare netAmount: string | null;
  declare fileKey: string;
  declare fileName: string;
  declare status: 'pending' | 'signed' | 'disputed';
  declare signedAt: Date | null;
  declare signatureIp: string | null;
  declare employeeComment: string | null;
  declare uploadedBy: number | null;
  declare createdAt: Date;
  declare Employee?: Employee;
}

Payslip.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    period: { type: DataTypes.CHAR(7), allowNull: false },
    kind: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'mensual' },
    grossAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    netAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    fileKey: { type: DataTypes.STRING(300), allowNull: false },
    fileName: { type: DataTypes.STRING(200), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
    signedAt: { type: DataTypes.DATE, allowNull: true },
    signatureIp: { type: DataTypes.STRING(64), allowNull: true },
    employeeComment: { type: DataTypes.TEXT, allowNull: true },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, modelName: 'Payslip', tableName: 'Payslip', timestamps: true },
);

export default Payslip;
