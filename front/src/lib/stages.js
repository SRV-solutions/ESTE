/**
 * Responsable de cada estado (espejo de api/src/services/serviceOrderPolicy.ts).
 * Si la etapa no tiene responsable asignado, le toca a quien creó la orden.
 */
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
  // Nadie aprueba su propia orden: sin chequeador asignado, la revisión es de un administrador.
  if (field === 'checkedBy') return order.checkedBy && order.checkedBy !== order.orderedBy ? order.checkedBy : null;
  return order[field] ?? order.orderedBy;
};

/** Órdenes en las que le toca actuar a este usuario. */
export const myTurn = (orders, userId) => orders.filter((o) => responsibleOf(o) === userId);
