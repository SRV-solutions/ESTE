import { Op, Transaction } from 'sequelize';
import { User } from '../models';

/** Usuarios que cuentan para el límite del plan: los que entran a la app de forma permanente. */
export const countAppUsers = (companyId: number, transaction?: Transaction) =>
  User.count({ where: { companyId, access: 'app' }, transaction });

/** Accesos temporales vigentes (tienen tope por plan). */
export const countActiveTemporary = (companyId: number, exceptUserId?: number, transaction?: Transaction) =>
  User.count({
    where: {
      companyId,
      access: 'temporary',
      accessUntil: { [Op.gt]: new Date() },
      ...(exceptUserId ? { id: { [Op.ne]: exceptUserId } } : {}),
    },
    transaction,
  });
