import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export const TAX_CONDITIONS = ['responsable_inscripto', 'monotributo', 'exento', 'consumidor_final'] as const;
export type TaxCondition = (typeof TAX_CONDITIONS)[number];

/** Empresa que alquila Sortex. Todo su stock, órdenes y usuarios cuelgan de acá. */
class Company extends Model {
  declare id: number;
  declare name: string;
  declare legalName: string | null;
  declare cuit: string | null;
  declare taxCondition: TaxCondition;
  declare email: string | null;
  declare phone: string | null;
  declare address: string | null;
  declare logoUrl: string | null;
  /** Suspensión manual desde el panel de SRV (además del bloqueo automático por falta de pago). */
  declare status: 'active' | 'suspended';
  declare monthlyPriceUsd: string;
  /** Hasta qué día está paga la suscripción. */
  declare paidUntil: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Company.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    legalName: { type: DataTypes.STRING(160), allowNull: true },
    cuit: { type: DataTypes.STRING(11), allowNull: true },
    taxCondition: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'consumidor_final' },
    email: { type: DataTypes.STRING(160), allowNull: true },
    phone: { type: DataTypes.STRING(60), allowNull: true },
    address: { type: DataTypes.STRING(200), allowNull: true },
    logoUrl: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'active' },
    monthlyPriceUsd: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 400 },
    paidUntil: { type: DataTypes.DATEONLY, allowNull: true },
  },
  { sequelize, modelName: 'Company', tableName: 'Company', timestamps: true },
);

export default Company;
