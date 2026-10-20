/**
 * Planes de Event Box.
 *
 * La lógica comercial: el salto de Básico a Profesional es por funciones (personal, sueldos,
 * planos, traspaso de material). De Profesional a Empresa la diferencia de precio es chica
 * (USD 200) pero suma 150 usuarios y los módulos de operación en el evento: el costo por
 * usuario cae de USD 17,33 (Básico) a USD 12 y a USD 5,60: subir de plan conviene apenas el equipo crece.
 */

export const FEATURES = {
  stock: 'Stock, categorías y contenedores',
  orders: 'Órdenes de servicio con PDF',
  events: 'Eventos y lugares',
  csvImport: 'Importación de stock por CSV',
  eventTools: 'Duplicar eventos y pasar material entre eventos',
  stageOwners: 'Responsables por etapa de cada orden',
  blueprints: 'Planos compartidos con el equipo',
  payroll: 'Personal y recibos de sueldo digitales',
  checkin: 'Check-in y check-out de material en el evento',
  reports: 'Reportes y estadísticas de uso del stock',
  multiWarehouse: 'Varios depósitos',
  apiAccess: 'API e integraciones',
  prioritySupport: 'Soporte prioritario por WhatsApp',
} as const;

export type Feature = keyof typeof FEATURES;
export type PlanId = 'basico' | 'profesional' | 'empresa';

/** Módulos que se muestran en los planes pero todavía se están construyendo. */
export const IN_DEVELOPMENT: Feature[] = ['checkin', 'reports', 'multiWarehouse', 'apiAccess'];

const BASIC: Feature[] = ['stock', 'orders', 'events', 'csvImport'];
const PRO: Feature[] = [...BASIC, 'eventTools', 'stageOwners', 'blueprints', 'payroll'];
const ENTERPRISE: Feature[] = [...PRO, 'checkin', 'reports', 'multiWarehouse', 'apiAccess', 'prioritySupport'];

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;
  maxUsers: number;
  /** Personas con acceso temporal (hasta TEMPORARY_MAX_DAYS días, renovable) activas a la vez. No cuentan en maxUsers. */
  maxTemporary: number;
  tagline: string;
  features: Feature[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'basico',
    name: 'Básico',
    priceUsd: 520,
    maxUsers: 30,
    maxTemporary: 10,
    tagline: 'Para ordenar el depósito y las órdenes de cada evento.',
    features: BASIC,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    priceUsd: 1200,
    maxUsers: 100,
    maxTemporary: 40,
    tagline: 'Para el equipo completo: personal, sueldos, planos y responsables por etapa.',
    features: PRO,
    highlight: true,
  },
  {
    id: 'empresa',
    name: 'Empresa',
    priceUsd: 1400,
    maxUsers: 250,
    maxTemporary: 100,
    tagline: 'Por USD 200 más: 150 usuarios extra y la operación en el evento.',
    features: ENTERPRISE,
  },
];

/** Máximo de días de cada acceso temporal; se puede renovar las veces que haga falta. */
export const TEMPORARY_MAX_DAYS = 10;

export const getPlan = (id: string | null | undefined): Plan => PLANS.find((p) => p.id === id) ?? PLANS[1];

/** Si la empresa tiene el módulo contratado (aunque esté en desarrollo). */
export const planHas = (planId: string | null | undefined, feature: Feature) => getPlan(planId).features.includes(feature);
