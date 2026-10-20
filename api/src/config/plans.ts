/**
 * Planes de Event Box.
 *
 * La lógica comercial: el salto de Básico a Profesional es por funciones (personal, sueldos,
 * planos, traspaso de material). De Profesional a Empresa la diferencia de precio es chica
 * (USD 150) pero suma 150 usuarios y los módulos de operación en el evento: el costo por
 * usuario cae de USD 18,33 (Básico) a USD 7,50 y a USD 3,60: subir de plan conviene apenas el equipo crece.
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
export const IN_DEVELOPMENT: Feature[] = ['multiWarehouse', 'apiAccess'];

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
    priceUsd: 550,
    maxUsers: 30,
    maxTemporary: 10,
    tagline: 'Para ordenar el depósito y las órdenes de cada evento.',
    features: BASIC,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    priceUsd: 750,
    maxUsers: 100,
    maxTemporary: 40,
    tagline: 'Para el equipo completo: personal, sueldos, planos y responsables por etapa.',
    features: PRO,
    highlight: true,
  },
  {
    id: 'empresa',
    name: 'Empresa',
    priceUsd: 900,
    maxUsers: 250,
    maxTemporary: 100,
    tagline: 'Por USD 150 más: 150 usuarios extra y la operación en el evento.',
    features: ENTERPRISE,
  },
];

/** Máximo de días de cada acceso temporal; se puede renovar las veces que haga falta. */
export const TEMPORARY_MAX_DAYS = 10;

export const getPlan = (id: string | null | undefined): Plan => PLANS.find((p) => p.id === id) ?? PLANS[1];

/** Si la empresa tiene el módulo contratado (aunque esté en desarrollo). */
export const planHas = (planId: string | null | undefined, feature: Feature) => getPlan(planId).features.includes(feature);

/**
 * Qué puede permitir un rol, por sección. `feature` indica el módulo del plan que la habilita:
 * si la empresa no lo tiene, el permiso se muestra con candado y no tiene efecto.
 */
export const PERMISSION_ENTITIES: Array<{ id: string; label: string; hint: string; actions: string[]; feature?: Feature }> = [
  { id: 'serviceOrders', label: 'Órdenes de servicio', hint: 'Crear órdenes, cargar material, avanzar etapas', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'events', label: 'Eventos', hint: 'Eventos y su duplicado', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'locations', label: 'Lugares', hint: 'Salones, predios y sus coordenadas', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'items', label: 'Stock', hint: 'Ítems y contenedores', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'categories', label: 'Categorías', hint: 'Categorías del stock', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'users', label: 'Equipo', hint: 'Personas y accesos (los roles son solo del administrador)', actions: ['read', 'create', 'update', 'delete'] },
  { id: 'blueprints', label: 'Planos', hint: 'Subir, ver y borrar planos', actions: ['read', 'create', 'update', 'delete'], feature: 'blueprints' },
  { id: 'payroll', label: 'Sueldos', hint: 'Datos laborales y recibos de todo el personal', actions: ['read', 'create', 'update', 'delete'], feature: 'payroll' },
  { id: 'checkin', label: 'Check-in / out', hint: 'Ver el historial y registrar llegadas y retiros', actions: ['read', 'create'], feature: 'checkin' },
  { id: 'reports', label: 'Reportes', hint: 'Estadísticas de uso del stock', actions: ['read'], feature: 'reports' },
];
