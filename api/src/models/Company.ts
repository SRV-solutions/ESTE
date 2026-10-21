import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';
import type { PlanId } from '../config/plans';

export const TAX_CONDITIONS = ['responsable_inscripto', 'monotributo', 'exento', 'consumidor_final'] as const;
export type TaxCondition = (typeof TAX_CONDITIONS)[number];

/** Empresa que alquila Event Box. Todo su stock, órdenes y usuarios cuelgan de acá. */
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
  /** Plan contratado (config/plans.ts): define módulos y límite de usuarios. */
  declare plan: PlanId;
  /** Precio que paga: el del plan, salvo que SRV le haya puesto uno especial. */
  declare monthlyPriceUsd: string;
  /** Hasta qué día está paga la suscripción. */
  declare paidUntil: string | null;
  /** Acuerdo especial de SRV (ver services/plan.ts): precio, módulos y límites propios por un período. */
  declare dealFrom: string | null;
  declare dealUntil: string | null;
  declare dealPriceUsd: string | null;
  declare dealFeatures: string[] | null;
  declare dealMaxUsers: number | null;
  declare dealMaxTemporary: number | null;
  declare dealNote: string | null;
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
    plan: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'profesional' },
    monthlyPriceUsd: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 400 },
    paidUntil: { type: DataTypes.DATEONLY, allowNull: true },
    dealFrom: { type: DataTypes.DATEONLY, allowNull: true },
    dealUntil: { type: DataTypes.DATEONLY, allowNull: true },
    dealPriceUsd: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    dealFeatures: { type: DataTypes.JSONB, allowNull: true },
    dealMaxUsers: { type: DataTypes.INTEGER, allowNull: true },
    dealMaxTemporary: { type: DataTypes.INTEGER, allowNull: true },
    dealNote: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'Company', tableName: 'Company', timestamps: true },
);

export default Company;
