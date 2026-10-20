import type { AuthUser } from '../middlewares/auth';
import type ServiceOrder from '../models/ServiceOrder';
import { ServiceOrderStatus as S } from '../models/enums';
import { HttpError } from '../utils/http';

/**
 * Reglas de negocio de las órdenes de servicio. El front no las duplica: el detalle de la
 * orden le devuelve `access` ya calculado para el usuario actual.
 */

const LINEAR_FLOW: S[] = [
  S.Created,
  S.InReview,
  S.Approved,
  S.InProcess,
  S.Ready,
  S.Dispatched,
  S.Delivered,
  S.Returning,
  S.Received,
  S.UnderReview,
  S.Disassembled,
];

/** Estados a los que se puede pasar desde `from`, sin mirar quién lo hace. */
export const nextStatuses = (from: S): S[] => {
  if (from === S.InReview) return [S.Approved, S.Rejected];
  if (from === S.Rejected) return [S.InReview];
  const i = LINEAR_FLOW.indexOf(from);
  return i >= 0 && i < LINEAR_FLOW.length - 1 ? [LINEAR_FLOW[i + 1]] : [];
};

type StageField = 'orderedBy' | 'checkedBy' | 'deployedBy' | 'logisticsBy' | 'receptionBy';

/**
 * Cada etapa tiene su responsable: es quien avanza la orden desde ese estado.
 * Si la etapa no tiene responsable asignado, la avanza quien creó la orden.
 */
export const STAGES: Array<{ key: string; label: string; field: StageField; statuses: S[] }> = [
  { key: 'armado', label: 'Preparación', field: 'orderedBy', statuses: [S.Created, S.Rejected] },
  { key: 'chequeo', label: 'Chequeo', field: 'checkedBy', statuses: [S.InReview] },
  { key: 'deposito', label: 'Armado en depósito', field: 'deployedBy', statuses: [S.Approved, S.InProcess] },
  { key: 'logistica', label: 'Logística y traslado', field: 'logisticsBy', statuses: [S.Ready, S.Dispatched, S.Delivered] },
  { key: 'recepcion', label: 'Recepción y desarme', field: 'receptionBy', statuses: [S.Returning, S.Received, S.UnderReview] },
];

export const stageOf = (status: S) => STAGES.find((s) => s.statuses.includes(status)) ?? null;

/**
 * Quién está a cargo del estado actual: el responsable de la etapa o, si no hay, quien creó la orden.
 * Excepción: el chequeo nunca recae en quien la creó (nadie aprueba su propia orden); sin
 * chequeador asignado, solo un administrador la aprueba o rechaza.
 */
export const currentResponsibleId = (order: ServiceOrder) => {
  const stage = stageOf(order.status);
  if (!stage) return null;
  const assigned = order[stage.field] as number | null;
  if (stage.key === 'chequeo') return assigned && assigned !== order.orderedBy ? assigned : null;
  return assigned ?? order.orderedBy;
};

/** Mientras está en estos estados, quien la creó puede editar su contenido. */
const OWNER_EDITABLE: S[] = [S.Created, S.Rejected];

export const canEditOrder = (user: AuthUser, order: ServiceOrder) =>
  user.isAdmin || (order.orderedBy === user.id && OWNER_EDITABLE.includes(order.status));

export const canChangeStatus = (user: AuthUser, order: ServiceOrder, to: S) => {
  if (!nextStatuses(order.status).includes(to)) return false;
  if (user.isAdmin) return true;
  return currentResponsibleId(order) === user.id;
};

/** Estados desde los que el material puede pasar directo a otro evento (ya salió del depósito). */
export const TRANSFERABLE: S[] = [S.Delivered, S.Returning, S.Received, S.UnderReview];

export const canTransfer = (user: AuthUser, order: ServiceOrder) =>
  TRANSFERABLE.includes(order.status) &&
  (user.isAdmin || [order.orderedBy, order.logisticsBy, order.receptionBy].includes(user.id));

export const accessFor = (user: AuthUser, order: ServiceOrder) => {
  const stage = stageOf(order.status);
  return {
    canEdit: canEditOrder(user, order),
    canTransfer: canTransfer(user, order),
    nextStatuses: nextStatuses(order.status).filter((s) => canChangeStatus(user, order, s)),
    stage: stage ? { key: stage.key, label: stage.label, responsibleId: currentResponsibleId(order) } : null,
  };
};

export const assertCanEdit = (user: AuthUser, order: ServiceOrder) => {
  if (!canEditOrder(user, order)) {
    throw new HttpError(
      403,
      'Solo quien creó la orden puede modificarla, y únicamente mientras está creada o rechazada.',
    );
  }
};
