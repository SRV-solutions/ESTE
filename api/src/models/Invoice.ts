import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

/** Factura electrónica emitida en ARCA por un pago (o el intento fallido, con su error). */
class Invoice extends Model {
  declare id: number;
  declare companyId: number;
  declare paymentId: number;
  declare status: 'issued' | 'failed';
  declare pointOfSale: number | null;
  declare voucherType: number | null;
  declare voucherNumber: number | null;
  declare cae: string | null;
  declare caeExpiresAt: string | null;
  declare amountArs: string;
  declare receiverDocType: number | null;
  declare receiverDocNumber: string | null;
  declare receiverName: string | null;
  declare receiverTaxCondition: string | null;
  declare serviceFrom: string | null;
  declare serviceTo: string | null;
  declare error: string | null;
  declare issuedAt: Date | null;
  declare createdAt: Date;
}

Invoice.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    paymentId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false },
    pointOfSale: { type: DataTypes.INTEGER, allowNull: true },
    voucherType: { type: DataTypes.INTEGER, allowNull: true },
    voucherNumber: { type: DataTypes.INTEGER, allowNull: true },
    cae: { type: DataTypes.STRING(20), allowNull: true },
    caeExpiresAt: { type: DataTypes.DATEONLY, allowNull: true },
    amountArs: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    receiverDocType: { type: DataTypes.INTEGER, allowNull: true },
    receiverDocNumber: { type: DataTypes.STRING(20), allowNull: true },
    receiverName: { type: DataTypes.STRING(160), allowNull: true },
    receiverTaxCondition: { type: DataTypes.STRING(32), allowNull: true },
    serviceFrom: { type: DataTypes.DATEONLY, allowNull: true },
    serviceTo: { type: DataTypes.DATEONLY, allowNull: true },
    error: { type: DataTypes.TEXT, allowNull: true },
    issuedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'Invoice', tableName: 'Invoice', timestamps: true },
);

export default Invoice;
