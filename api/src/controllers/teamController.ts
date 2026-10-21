import { Request, Response } from 'express';
import { literal, Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { env } from '../config/env';
import { TEMPORARY_MAX_DAYS } from '../config/plans';
import { planHasFeature } from '../services/plan';
import { tenant } from '../middlewares/auth';
import { Employee, Payslip, Role, User } from '../models';
import { hasLogin, UserAccess } from '../models/User';
import { countActiveTemporary, countAppUsers, fichaOf, findTeamMember, personName } from '../services/team';
import { deletePrivateFile } from '../services/storage';
import { HttpError, parseId, pick } from '../utils/http';
import { isValidCuit } from '../utils/companyInput';
import { assertNotLastAdmin, assertPassword, hashPassword, validateProfile } from '../services/users';

/**
 * Equipo: todas las personas de la empresa en un solo lugar.
 * Cada una es un User con un tipo de acceso (app, temporal o sin acceso) y, si el plan tiene
 * sueldos, una ficha laboral (Employee) con CUIL, puesto, área, ingreso y teléfono.
 */

const ACCESS: UserAccess[] = ['app', 'temporary', 'none'];
const FICHA_FIELDS = ['cuil', 'position', 'area', 'startDate', 'phone', 'isActive'] as const;

const trimOrNull = (v: unknown) => (v === undefined ? undefined : String(v ?? '').trim() || null);

const parseFicha = (body: Record<string, unknown>) => {
  const data = pick(body, FICHA_FIELDS);
  for (const k of ['position', 'area', 'phone'] as const) if (data[k] !== undefined) data[k] = trimOrNull(data[k]);
  if (data.cuil !== undefined) {
    const cuil = String(data.cuil ?? '').replace(/\D/g, '');
    if (cuil && !isValidCuit(cuil)) throw new HttpError(400, 'El CUIL no es válido.', { cuil: 'CUIL inválido.' });
    data.cuil = cuil || null;
  }
  if (data.startDate !== undefined) data.startDate = data.startDate ? String(data.startDate).slice(0, 10) : null;
  if (data.isActive !== undefined) data.isActive = Boolean(data.isActive);
  return data;
};

const assertCuilFree = async (companyId: number, cuil: unknown, userId?: number) => {
  if (!cuil) return;
  const other = await Employee.findOne({ where: { companyId, cuil, ...(userId ? { userId: { [Op.ne]: userId } } : {}) }, include: [User] });
  if (other) throw new HttpError(409, `Ese CUIL ya es de ${personName(other.User)}.`, { cuil: 'CUIL repetido.' });
};

/** El rol tiene que ser de la empresa (o el Administrador), y solo un administrador puede darlo. */
const assertCompanyRole = async (req: Request, roleId: unknown) => {
  const id = parseId(roleId, 'rol');
  const role = await Role.findOne({ where: { id, [Op.or]: [{ companyId: tenant(req) }, { id: env.adminRoleId }] } });
  if (!role) throw new HttpError(404, 'El rol no existe.', { roleId: 'Elegí un rol.' });
  if (id === env.adminRoleId && !req.user!.isAdmin) throw new HttpError(403, 'Solo un administrador puede dar el rol Administrador.', { roleId: 'Elegí otro rol.' });
};

const parseDays = (value: unknown) => {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > TEMPORARY_MAX_DAYS) {
    throw new HttpError(400, `El acceso temporal dura de 1 a ${TEMPORARY_MAX_DAYS} días.`, { days: `Entre 1 y ${TEMPORARY_MAX_DAYS} días.` });
  }
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

/**
 * Reglas de cada tipo de acceso:
 * - app: cuenta para el límite de usuarios del plan.
 * - temporary: de 1 a TEMPORARY_MAX_DAYS días (renovable), sin rol de administrador, con tope de temporales activos por plan.
 * - none: solo personal (requiere el módulo de sueldos).
 */
const assertAccessAllowed = async (
  req: Request,
  access: UserAccess,
  { roleId, wasActiveApp, renewing, userId }: { roleId: number | null; wasActiveApp: boolean; renewing: boolean; userId?: number },
  transaction: Transaction,
) => {
  const companyId = tenant(req);
  const plan = req.user!.plan!;
  if (access === 'app' && !wasActiveApp) {
    if ((await countAppUsers(companyId, transaction)) >= plan.maxUsers) {
      throw new HttpError(
        403,
        `Llegaron al límite de ${plan.maxUsers} usuarios del plan ${plan.name}. Podés darle acceso temporal, o un administrador puede pasar a un plan mayor desde Mi empresa.`,
      );
    }
  }
  if (access === 'temporary') {
    if (roleId === env.adminRoleId) throw new HttpError(400, 'Un acceso temporal no puede tener rol de administrador.', { roleId: 'Elegí otro rol.' });
    if (renewing && (await countActiveTemporary(companyId, userId, transaction)) >= plan.maxTemporary) {
      throw new HttpError(403, `El plan ${plan.name} permite ${plan.maxTemporary} accesos temporales activos a la vez. Esperá a que venza alguno o pasá a un plan mayor.`);
    }
  }
  if (access === 'none' && !planHasFeature(req.user!.plan, 'payroll')) {
    throw new HttpError(403, 'Las personas sin acceso a la app son parte del módulo de sueldos (plan Profesional).');
  }
};

const COUNT = (extra = '') => literal(`(SELECT COUNT(*) FROM "Payslip" p WHERE p."employeeId" = "Employee"."id"${extra})::int`);

export const listTeam = async (req: Request, res: Response) => {
  const companyId = tenant(req);
  const plan = req.user!.plan!;
  const payroll = planHasFeature(req.user!.plan, 'payroll');
  const users = await User.findAll({
    where: { companyId },
    attributes: ['id', 'username', 'email', 'firstname', 'lastname', 'avatarUrl', 'roleId', 'access', 'accessUntil', 'disabledAt'],
    include: [
      { model: Role, attributes: ['id', 'roleName'] },
      ...(payroll
        ? [{ model: Employee, required: false, attributes: { include: [[COUNT(), 'payslipCount'], [COUNT(` AND p.status = 'pending'`), 'pendingCount']] } }]
        : []),
    ] as never,
  });

  const people = users.map((u) => {
    const f = u.Employee?.get({ plain: true }) as (Employee & { payslipCount: number; pendingCount: number }) | undefined;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      firstname: u.firstname,
      lastname: u.lastname,
      avatarUrl: u.avatarUrl,
      roleId: u.roleId,
      roleName: u.Role?.roleName ?? null,
      access: u.access,
      accessUntil: u.accessUntil,
      disabledAt: u.disabledAt,
      canLogin: hasLogin(u),
      ...(payroll
        ? {
            cuil: f?.cuil ?? null,
            position: f?.position ?? null,
            area: f?.area ?? null,
            startDate: f?.startDate ?? null,
            phone: f?.phone ?? null,
            isActive: f?.isActive ?? true,
            payslipCount: f?.payslipCount ?? 0,
            pendingCount: f?.pendingCount ?? 0,
          }
        : {}),
    };
  });
  people.sort((a, b) => personName(a).localeCompare(personName(b), 'es'));

  const [appUsers, activeTemporary] = await Promise.all([countAppUsers(companyId), countActiveTemporary(companyId)]);
  res.json({
    people,
    limits: { maxUsers: plan.maxUsers, appUsers, maxTemporary: plan.maxTemporary, activeTemporary, temporaryMaxDays: TEMPORARY_MAX_DAYS },
    payroll,
  });
};

const parseAccess = (value: unknown, fallback: UserAccess) => {
  if (value === undefined) return fallback;
  if (!ACCESS.includes(value as UserAccess)) throw new HttpError(400, 'Tipo de acceso inválido.');
  return value as UserAccess;
};

export const createPerson = async (req: Request, res: Response) => {
  const companyId = tenant(req);
  const access = parseAccess(req.body.access, 'app');
  const login = access !== 'none';
  const firstname = trimOrNull(req.body.firstname) ?? null;
  const lastname = trimOrNull(req.body.lastname) ?? null;
  const email = trimOrNull(req.body.email) ?? null;
  const username = login ? (trimOrNull(req.body.username) ?? null) : null;
  const roleId = login ? (req.body.roleId ? Number(req.body.roleId) : null) : null;

  if (!firstname) throw new HttpError(400, 'El nombre es obligatorio.', { firstname: 'Obligatorio.' });
  if (login && !username) throw new HttpError(400, 'Elegí el usuario con el que va a entrar.', { username: 'Obligatorio.' });
  if (access === 'app' && !email) throw new HttpError(400, 'El email es obligatorio para quien usa la app.', { email: 'Obligatorio.' });
  await validateProfile({ username: username ?? undefined, email: email ?? undefined, firstname, lastname: lastname ?? undefined });
  if (login) {
    assertPassword(req.body.password);
    await assertCompanyRole(req, roleId);
  }
  const accessUntil = access === 'temporary' ? parseDays(req.body.days) : null;
  const payroll = planHasFeature(req.user!.plan, 'payroll');
  const ficha = payroll ? parseFicha(req.body) : {};
  if (payroll) await assertCuilFree(companyId, ficha.cuil);

  const user = await sequelize.transaction(async (transaction) => {
    await assertAccessAllowed(req, access, { roleId, wasActiveApp: false, renewing: true }, transaction);
    const created = await User.create(
      {
        companyId,
        access,
        accessUntil,
        username,
        email,
        firstname,
        lastname,
        roleId,
        password: login ? await hashPassword(req.body.password) : null,
      },
      { transaction },
    );
    if (payroll) await Employee.create({ ...ficha, userId: created.id, companyId }, { transaction });
    return created;
  });

  const name = personName(user);
  const message =
    access === 'app'
      ? `${name} ya es parte del equipo y entra con el usuario ${username}.`
      : access === 'temporary'
        ? `${name} puede entrar con el usuario ${username} hasta el ${accessUntil!.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} h.`
        : `${name} ya es parte del personal (sin acceso a la app).`;
  res.status(201).json({ id: user.id, message });
};

export const updatePerson = async (req: Request, res: Response) => {
  const companyId = tenant(req);
  const user = await User.scope('withPassword').findOne({ where: { id: parseId(req.params.id, 'persona'), companyId } });
  if (!user) throw new HttpError(404, 'Esa persona no es de tu empresa.');
  const isMe = user.id === req.user!.id;
  // Solo un administrador toca a otro administrador (si no, cualquiera con permiso de usuarios podría quitarle el acceso o la contraseña).
  if (user.roleId === env.adminRoleId && !req.user!.isAdmin) throw new HttpError(403, 'Solo un administrador puede modificar a otro administrador.');

  const access = parseAccess(req.body.access, user.access);
  if (isMe && access !== user.access) throw new HttpError(400, 'No podés cambiar tu propio acceso.');
  const login = access !== 'none';
  const renewing = access === 'temporary' && (req.body.days !== undefined || user.access !== 'temporary');
  const accessUntil = access === 'temporary' ? (renewing ? parseDays(req.body.days) : user.accessUntil) : null;

  const firstname = trimOrNull(req.body.firstname);
  const lastname = trimOrNull(req.body.lastname);
  const email = trimOrNull(req.body.email);
  const username = trimOrNull(req.body.username);
  const roleId = req.body.roleId !== undefined && req.body.roleId !== '' ? Number(req.body.roleId) : user.roleId;
  const password = req.body.password ? String(req.body.password) : null;

  if (firstname === null) throw new HttpError(400, 'El nombre es obligatorio.', { firstname: 'Obligatorio.' });
  const finalEmail = email === undefined ? user.email : email;
  const finalUsername = username === undefined ? user.username : username;
  if (access === 'app' && !finalEmail) throw new HttpError(400, 'El email es obligatorio para quien usa la app.', { email: 'Obligatorio.' });
  if (login && !finalUsername) throw new HttpError(400, 'Elegí el usuario con el que va a entrar.', { username: 'Obligatorio.' });
  if (login && !user.password && !password) throw new HttpError(400, 'Poné una contraseña para que pueda entrar.', { password: 'Obligatoria.' });
  await validateProfile(
    { username: username ?? undefined, email: email ?? undefined, firstname: firstname ?? undefined, lastname: lastname ?? undefined },
    user.id,
  );
  if (password) assertPassword(password);
  if (login && !roleId) throw new HttpError(400, 'Elegí un rol.', { roleId: 'Obligatorio.' });
  if (roleId && roleId !== user.roleId) {
    if (isMe) throw new HttpError(400, 'No podés cambiar tu propio rol.', { roleId: 'No podés cambiar tu propio rol.' });
    await assertCompanyRole(req, roleId);
  }

  // Deja de ser administrador con acceso permanente: la empresa tiene que conservar otro.
  const wasAdmin = user.roleId === env.adminRoleId && user.access === 'app';
  const staysAdmin = roleId === env.adminRoleId && access === 'app';
  if (wasAdmin && !staysAdmin) await assertNotLastAdmin(user);

  const payroll = planHasFeature(req.user!.plan, 'payroll');
  const ficha = payroll ? parseFicha(req.body) : {};
  if (payroll) await assertCuilFree(companyId, ficha.cuil, user.id);

  await sequelize.transaction(async (transaction) => {
    await assertAccessAllowed(req, access, { roleId, wasActiveApp: user.access === 'app', renewing, userId: user.id }, transaction);
    await user.update(
      {
        access,
        accessUntil,
        username: finalUsername,
        email: finalEmail,
        firstname: firstname === undefined ? user.firstname : firstname,
        lastname: lastname === undefined ? user.lastname : lastname,
        roleId,
        ...(password ? { password: await hashPassword(password) } : {}),
      },
      { transaction },
    );
    if (payroll && Object.keys(ficha).length) await (await fichaOf(user, transaction)).update(ficha, { transaction });
  });
  res.json({ message: 'Datos guardados.' });
};

/** Quién puede tocar a esta persona: nadie a sí mismo, y a un administrador solo otro administrador. */
const assertCanManage = (req: Request, user: User, verb: string) => {
  if (user.id === req.user!.id) throw new HttpError(400, `No podés ${verb} tu propio usuario.`);
  if (user.roleId === env.adminRoleId && !req.user!.isAdmin) throw new HttpError(403, `Solo un administrador puede ${verb} a otro administrador.`);
};

/**
 * Desactivar: no entra ni cuenta para el plan, pero conserva su historial (órdenes, recibos).
 * Volver a activar vuelve a contar para el límite de usuarios.
 */
export const setDisabled = async (req: Request, res: Response) => {
  const user = await findTeamMember(tenant(req), req.params.id);
  const disabled = req.body.disabled !== false;
  assertCanManage(req, user, disabled ? 'desactivar' : 'activar');
  if (disabled === !!user.disabledAt) return res.json({ message: disabled ? 'Ya estaba desactivado.' : 'Ya estaba activo.' });
  if (disabled && user.roleId === env.adminRoleId && user.access === 'app') await assertNotLastAdmin(user);
  if (!disabled && user.access === 'app') {
    const plan = req.user!.plan!;
    if ((await countAppUsers(user.companyId!)) >= plan.maxUsers) {
      throw new HttpError(403, `Llegaron al límite de ${plan.maxUsers} usuarios del plan ${plan.name}: no se puede reactivar.`);
    }
  }
  await user.update({ disabledAt: disabled ? new Date() : null });
  res.json({ message: disabled ? `${personName(user)} quedó desactivado: no puede entrar y no cuenta para el plan.` : `${personName(user)} vuelve a estar activo.` });
};

/**
 * Borrado definitivo (solo administradores). Las órdenes que creó quedan sin creador, el material
 * que tiene a cargo sin responsable, y sus recibos de sueldo se borran con sus archivos.
 */
export const deletePerson = async (req: Request, res: Response) => {
  const user = await findTeamMember(tenant(req), req.params.id);
  assertCanManage(req, user, 'eliminar');
  if (user.roleId === env.adminRoleId && user.access === 'app' && !user.disabledAt) await assertNotLastAdmin(user);

  const employee = await Employee.findOne({ where: { userId: user.id } });
  const payslips = employee ? await Payslip.findAll({ where: { employeeId: employee.id }, attributes: ['id', 'fileKey'] }) : [];
  const name = personName(user);
  await sequelize.transaction(async (transaction) => {
    if (employee) await employee.destroy({ transaction }); // los recibos caen en cascada
    await user.destroy({ transaction });
  });
  for (const slip of payslips) await deletePrivateFile(slip.fileKey);
  res.json({ message: `${name} fue eliminado${payslips.length ? ` junto con ${payslips.length} recibo(s)` : ''}.` });
};
