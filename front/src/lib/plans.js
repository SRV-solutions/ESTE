/** Nombres de los módulos para mostrar (las reglas reales viven en la API: config/plans.ts). */
export const FEATURE_LABELS = {
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
};

/** Qué plan es el primero que incluye cada módulo (para los candados del menú). */
export const MIN_PLAN = {
  eventTools: 'Profesional',
  stageOwners: 'Profesional',
  blueprints: 'Profesional',
  payroll: 'Profesional',
  checkin: 'Empresa',
  reports: 'Empresa',
  multiWarehouse: 'Empresa',
  apiAccess: 'Empresa',
};

/** Planes para los selectores del Panel SRV (el detalle completo viene de GET /plans). */
export const PLAN_OPTIONS = [
  { id: 'basico', name: 'Básico', priceUsd: 520, maxUsers: 30, maxTemporary: 10 },
  { id: 'profesional', name: 'Profesional', priceUsd: 1200, maxUsers: 100, maxTemporary: 40 },
  { id: 'empresa', name: 'Empresa', priceUsd: 1400, maxUsers: 250, maxTemporary: 100 },
];
