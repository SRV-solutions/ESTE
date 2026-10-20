import { Op, Transaction } from 'sequelize';
import { Employee, User } from '../models';
import { HttpError, parseId } from '../utils/http';

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

type Named = { username: string | null; firstname: string | null; lastname: string | null };
export const personName = (u?: Named | null) => (u ? [u.firstname, u.lastname].filter(Boolean).join(' ') || u.username || '' : '');

/** La ficha laboral de la persona; se crea la primera vez que hace falta. */
export const fichaOf = async (user: User, transaction?: Transaction) => {
  const [ficha] = await Employee.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id, companyId: user.companyId }, transaction });
  return ficha;
};

export const findTeamMember = async (companyId: number, id: unknown) => {
  const user = await User.findOne({ where: { id: parseId(id, 'persona'), companyId } });
  if (!user) throw new HttpError(404, 'Esa persona no es de tu empresa.');
  return user;
};
