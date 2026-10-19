const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatArs = (value) => (value === null || value === undefined ? '—' : ars.format(Number(value)));
export const formatUsd = (value) => (value === null || value === undefined ? '—' : usd.format(Number(value)));

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const periodLabel = (period) => (period ? `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}` : '—');

export const TAX_CONDITIONS = [
  { value: 'responsable_inscripto', label: 'Responsable inscripto' },
  { value: 'monotributo', label: 'Monotributista' },
  { value: 'exento', label: 'Exento' },
  { value: 'consumidor_final', label: 'Consumidor final' },
];
export const taxConditionLabel = (value) => TAX_CONDITIONS.find((t) => t.value === value)?.label ?? '—';

export const PAYMENT_STATUS = {
  pending: { label: 'Pendiente', color: 'warning' },
  approved: { label: 'Aprobado', color: 'success' },
  rejected: { label: 'Rechazado', color: 'error' },
  cancelled: { label: 'Cancelado', color: 'default' },
};

export const ACCESS_STATE = {
  active: { label: 'Al día', color: 'success' },
  grace: { label: 'Vencida (en gracia)', color: 'warning' },
  blocked: { label: 'Bloqueada por falta de pago', color: 'error' },
  suspended: { label: 'Suspendida', color: 'default' },
};
