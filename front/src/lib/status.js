/** Estados de una orden de servicio: etiqueta, color y el verbo para pasar a ese estado. */
export const STATUS = {
  created: { label: 'Creada', color: 'default', action: 'Volver a creada' },
  in_review: { label: 'En revisión', color: 'warning', action: 'Enviar a revisión' },
  approved: { label: 'Aprobada', color: 'success', action: 'Aprobar' },
  rejected: { label: 'Rechazada', color: 'error', action: 'Rechazar' },
  in_process: { label: 'Armando', color: 'primary', action: 'Empezar a armar' },
  ready: { label: 'Lista', color: 'success', action: 'Marcar como lista' },
  dispatched: { label: 'Despachada', color: 'primary', action: 'Despachar' },
  delivered: { label: 'En el evento', color: 'primary', action: 'Marcar entregada' },
  returning: { label: 'Volviendo', color: 'primary', action: 'Marcar en regreso' },
  received: { label: 'Recibida', color: 'secondary', action: 'Recibir en depósito' },
  under_review: { label: 'Revisando material', color: 'warning', action: 'Revisar material' },
  disassembled: { label: 'Desarmada', color: 'default', action: 'Desarmar y liberar ítems' },
};

export const STATUS_ORDER = Object.keys(STATUS);

export const statusLabel = (status) => STATUS[status]?.label ?? 'Desconocido';

/** Estados en los que el material sigue fuera o comprometido (todo menos desarmada). */
export const isActiveStatus = (status) => status !== 'disassembled';

/** Transiciones que requieren confirmación porque afectan a otras personas o liberan stock. */
export const CONFIRM_STATUSES = new Set(['approved', 'rejected', 'disassembled']);
