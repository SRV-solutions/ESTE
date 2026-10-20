import { C } from './theme';

/** Estados de una orden (mismo catálogo que el front web). */
export const STATUS = {
  created: { label: 'Creada', color: C.text3, action: 'Volver a creada' },
  in_review: { label: 'En revisión', color: C.warn, action: 'Enviar a revisión' },
  approved: { label: 'Aprobada', color: C.ok, action: 'Aprobar' },
  rejected: { label: 'Rechazada', color: C.danger, action: 'Rechazar' },
  in_process: { label: 'Armando', color: C.primary, action: 'Empezar a armar' },
  ready: { label: 'Lista', color: C.ok, action: 'Marcar como lista' },
  dispatched: { label: 'Despachada', color: C.primary, action: 'Despachar' },
  delivered: { label: 'En el evento', color: C.primary, action: 'Marcar entregada' },
  returning: { label: 'Volviendo', color: C.primary, action: 'Marcar en regreso' },
  received: { label: 'Recibida', color: C.accent, action: 'Recibir en depósito' },
  under_review: { label: 'Revisando material', color: C.warn, action: 'Revisar material' },
  disassembled: { label: 'Desarmada', color: C.text3, action: 'Desarmar y liberar ítems' },
};

export const STATUS_ORDER = Object.keys(STATUS);
export const statusLabel = (status) => STATUS[status]?.label ?? 'Desconocido';
export const isActiveStatus = (status) => status !== 'disassembled';

/** Responsable de cada estado (espejo de api/src/services/serviceOrderPolicy.ts). */
const STAGE_FIELD = {
  created: 'orderedBy',
  rejected: 'orderedBy',
  in_review: 'checkedBy',
  approved: 'deployedBy',
  in_process: 'deployedBy',
  ready: 'logisticsBy',
  dispatched: 'logisticsBy',
  delivered: 'logisticsBy',
  returning: 'receptionBy',
  received: 'receptionBy',
  under_review: 'receptionBy',
};

export const responsibleOf = (order) => {
  const field = STAGE_FIELD[order.status];
  if (!field) return null;
  if (field === 'checkedBy') return order.checkedBy && order.checkedBy !== order.orderedBy ? order.checkedBy : null;
  return order[field] ?? order.orderedBy;
};
