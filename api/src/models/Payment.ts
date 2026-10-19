import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type Company from './Company';
import type Invoice from './Invoice';

/** Pago de un mes de suscripción. El monto en pesos queda fijado con el dólar blue del momento. */
class Payment extends Model {
  declare id: number;
  declare companyId: number;
  /** Mes que paga, `YYYY-MM`. */
  declare period: string;
  declare amountUsd: string;
  declare exchangeRate: string;
  declare amountArs: string;
  declare status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  declare method: 'mercadopago' | 'manual';
  declare mpPreferenceId: string | null;
  declare mpPaymentId: string | null;
  declare paidAt: Date | null;
  declare createdAt: Date;
  declare Company?: Company;
  declare Invoice?: Invoice;
}

Payment.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false },
    period: { type: DataTypes.CHAR(7), allowNull: false },
    amountUsd: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    exchangeRate: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    amountArs: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
    method: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'mercadopago' },
    mpPreferenceId: { type: DataTypes.STRING(80), allowNull: true },
    mpPaymentId: { type: DataTypes.STRING(40), allowNull: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'Payment', tableName: 'Payment', timestamps: true },
);

export default Payment;
