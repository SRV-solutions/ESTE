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

/** Mientras está en estos estados, quien la creó puede editar su contenido. */
const OWNER_EDITABLE: S[] = [S.Created, S.Rejected];

/** Tramo logístico (de "lista" a "desarmada") que avanza quien creó la orden. */
const OWNER_LOGISTICS: S[] = [S.Ready, S.Dispatched, S.Delivered, S.Returning, S.Received, S.UnderReview];

export const canEditOrder = (user: AuthUser, order: ServiceOrder) =>
  user.isAdmin || (order.orderedBy === user.id && OWNER_EDITABLE.includes(order.status));

export const canChangeStatus = (user: AuthUser, order: ServiceOrder, to: S) => {
  if (!nextStatuses(order.status).includes(to)) return false;
  if (user.isAdmin) return true;

  const from = order.status;
  const isOwner = order.orderedBy === user.id;
  const isChecker = order.checkedBy === user.id;
  const isDeployer = order.deployedBy === user.id;

  if (isOwner && (OWNER_EDITABLE.includes(from) || OWNER_LOGISTICS.includes(from))) return true;
  if (isChecker && from === S.InReview) return true; // aprobar o rechazar
  if (isDeployer && (from === S.Approved || from === S.InProcess)) return true; // armar
  return false;
};

export const accessFor = (user: AuthUser, order: ServiceOrder) => ({
  canEdit: canEditOrder(user, order),
  nextStatuses: nextStatuses(order.status).filter((s) => canChangeStatus(user, order, s)),
});

export const assertCanEdit = (user: AuthUser, order: ServiceOrder) => {
  if (!canEditOrder(user, order)) {
    throw new HttpError(
      403,
      'Solo quien creó la orden puede modificarla, y únicamente mientras está creada o rechazada.',
    );
  }
};
