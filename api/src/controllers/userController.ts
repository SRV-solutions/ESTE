import crypto from 'crypto';
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { env } from '../config/env';
import { assertCanLogin, signToken, tenant } from '../middlewares/auth';
import { effectivePlan } from '../services/plan';
import { Company, LoginLinkToken, PasswordResetToken, Permission, Role, User } from '../models';
import { hasLogin } from '../models/User';
import { countAppUsers } from '../services/team';
import { assertPassword, checkPassword, findByIdentifier, hashPassword, normalizeDni, validateProfile } from '../services/users';
import { button, paragraph, sendEmail } from '../services/email';
import { deleteByUrl, saveImage } from '../services/storage';
import { subscriptionState } from '../services/subscription';
import { HttpError, parseId } from '../utils/http';

const roleWithPermissions = { model: Role, include: [{ model: Permission, through: { attributes: [] } }] };
const sessionIncludes = [roleWithPermissions, { model: Company }];
const ROLE_BRIEF = { model: Role, attributes: ['id', 'roleName'] };

/** Forma única del usuario autenticado (login y perfil devuelven lo mismo). */
const toSession = async (user: User) => {
  const plan = user.Company ? effectivePlan(user.Company) : null;
  const userCount = user.companyId ? await countAppUsers(user.companyId) : 0;
  return {
    ...baseSession(user),
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          features: plan.features,
          inDevelopment: plan.inDevelopment,
          maxUsers: plan.maxUsers,
          maxTemporary: plan.maxTemporary,
          priceUsd: plan.priceUsd,
          custom: plan.custom,
          dealUntil: plan.custom ? plan.deal?.until ?? null : null,
          dealNote: plan.custom ? plan.deal?.note ?? null : null,
          userCount,
        }
      : null,
  };
};

const baseSession = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  dni: user.dni,
  firstname: user.firstname,
  lastname: user.lastname,
  avatarUrl: user.avatarUrl,
  access: user.access,
  accessUntil: user.accessUntil,
  roleId: user.roleId,
  roleName: user.Role?.roleName ?? null,
  isAdmin: !!user.companyId && user.roleId === env.adminRoleId,
  isSuperAdmin: user.isSuperAdmin,
  permissions: (user.Role?.Permissions || []).map((p) => ({ entity: p.entity, action: p.action })),
  company: user.Company
    ? {
        id: user.Company.id,
        name: user.Company.name,
        phone: user.Company.phone,
        address: user.Company.address,
        logoUrl: user.Company.logoUrl,
        subscription: subscriptionState(user.Company),
      }
    : null,
});

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) throw new HttpError(400, 'Ingresá tu usuario, email o DNI, y la contraseña.');

  // Se entra con el usuario, el email o el DNI.
  const user = await User.scope('withPassword').findOne({ ...findByIdentifier(String(username)), include: sessionIncludes });
  // Mismo mensaje para usuario inexistente y contraseña incorrecta: no revela qué usuarios existen.
  if (!user?.password || !(await checkPassword(password, user.password))) {
    throw new HttpError(401, 'Usuario, email o DNI incorrecto, o contraseña incorrecta.');
  }
  assertCanLogin(user);

  res.json({ token: signToken(user), user: await toSession(user) });
};

export const getMyProfile = async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.id, { include: sessionIncludes });
  if (!user) throw new HttpError(404, 'Usuario no encontrado.');
  res.json(await toSession(user));
};

export const updateMyProfile = async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado.');

  // Solo datos personales: el rol y la contraseña no se cambian desde acá.
  const { username, email, firstname, lastname } = req.body;
  const dni = req.body.dni === undefined ? undefined : normalizeDni(req.body.dni);
  await validateProfile({ username, email, firstname, lastname, dni }, user.id);

  await user.update({
    username: username ?? user.username,
    email: email ?? user.email,
    ...(dni !== undefined ? { dni } : {}),
    firstname: firstname?.trim() || null,
    lastname: lastname?.trim() || null,
  });

  const fresh = await User.findByPk(user.id, { include: sessionIncludes });
  res.json(await toSession(fresh!));
};

export const changeMyPassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.scope('withPassword').findByPk(req.user!.id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado.');

  if (!currentPassword || !(await checkPassword(currentPassword, user.password))) {
    throw new HttpError(400, 'La contraseña actual es incorrecta.', { currentPassword: 'Contraseña incorrecta.' });
  }
  assertPassword(newPassword, 'newPassword');

  await user.update({ password: await hashPassword(newPassword) });
  res.json({ message: 'Contraseña actualizada.' });
};

// ---------- Foto de perfil ----------

export const uploadMyAvatar = async (req: Request, res: Response) => {
  if (!req.file) throw new HttpError(400, 'Elegí una imagen.');
  const user = await User.findByPk(req.user!.id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado.');
  const previous = user.avatarUrl;
  await user.update({ avatarUrl: await saveImage(req.file.buffer, `usuarios/${user.id}`, 'avatar') });
  await deleteByUrl(previous);
  const fresh = await User.findByPk(user.id, { include: sessionIncludes });
  res.json(await toSession(fresh!));
};

export const deleteMyAvatar = async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.id);
  if (!user) throw new HttpError(404, 'Usuario no encontrado.');
  const previous = user.avatarUrl;
  await user.update({ avatarUrl: null });
  await deleteByUrl(previous);
  const fresh = await User.findByPk(user.id, { include: sessionIncludes });
  res.json(await toSession(fresh!));
};

// ---------- Recuperar contraseña ----------

const RESET_TTL_MS = 60 * 60 * 1000;
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Manda un link para elegir una contraseña nueva. Responde siempre lo mismo,
 * exista o no el usuario, para no revelar qué emails están registrados.
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const identifier = String(req.body.identifier || '').trim();
  const generic = { message: 'Si el usuario existe, le mandamos un mail con un link para elegir una contraseña nueva.' };
  if (!identifier) throw new HttpError(400, 'Ingresá tu usuario, tu email o tu DNI.');

  const user = await User.findOne(findByIdentifier(identifier));
  if (!user?.email || !hasLogin(user)) return res.json(generic);

  const token = crypto.randomBytes(32).toString('hex');
  await PasswordResetToken.create({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });

  const link = `${env.appUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Elegí una contraseña nueva para Event Box',
    title: 'Recuperar contraseña',
    body:
      paragraph(`Hola ${user.firstname || user.username}, pediste cambiar la contraseña de tu usuario ${user.username}.`) +
      button('Elegir contraseña nueva', link) +
      paragraph('El link vence en 1 hora y sirve una sola vez. Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.'),
  });
  if (!env.isProduction) console.log(`[eventbox] Link de recuperación para ${user.username}: ${link}`);

  res.json(generic);
};

// ---------- Entrar en el celular con el QR ----------

const LINK_TTL_MS = 5 * 60 * 1000;

/**
 * Desde una sesión abierta (la PC) genera un link de un solo uso que vale 5 minutos: el celular
 * lo escanea y entra como la misma persona, sin escribir la contraseña. Se guarda hasheado.
 */
export const createLoginLink = async (req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);
  // Un solo link vivo por persona: los anteriores dejan de servir.
  await LoginLinkToken.update({ usedAt: new Date() }, { where: { userId: req.user!.id, usedAt: null } });
  await LoginLinkToken.create({ userId: req.user!.id, tokenHash: sha256(token), expiresAt });
  res.json({ url: `${env.appUrl}/login?link=${token}`, expiresAt });
};

export const redeemLoginLink = async (req: Request, res: Response) => {
  const token = String(req.body.token || '');
  const record = token ? await LoginLinkToken.findOne({ where: { tokenHash: sha256(token) } }) : null;
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'El código ya se usó o venció. Volvé a abrir "Llevar al celular" en la PC y escaneá el nuevo.');
  }
  const user = await User.findByPk(record.userId, { include: sessionIncludes });
  if (!user) throw new HttpError(400, 'El usuario ya no existe.');
  assertCanLogin(user);
  await record.update({ usedAt: new Date() });
  res.json({ token: signToken(user), user: await toSession(user) });
};

export const resetPassword = async (req: Request, res: Response) => {
  const token = String(req.body.token || '');
  const record = token ? await PasswordResetToken.findOne({ where: { tokenHash: sha256(token) } }) : null;
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'El link no es válido o ya venció. Pedí uno nuevo.');
  }
  assertPassword(req.body.password);

  await sequelize.transaction(async (transaction) => {
    await User.update({ password: await hashPassword(req.body.password) }, { where: { id: record.userId }, transaction });
    // El link usado y cualquier otro pendiente del mismo usuario dejan de servir.
    await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId: record.userId, usedAt: null }, transaction });
  });
  res.json({ message: 'Listo: ya podés entrar con tu contraseña nueva.' });
};

/** Personas que entran a la app (para elegir responsables). El equipo completo está en /team. */
export const listUsers = async (req: Request, res: Response) => {
  const users = await User.findAll({
    where: { companyId: tenant(req), access: { [Op.ne]: 'none' } },
    include: [ROLE_BRIEF],
    order: [['username', 'ASC']],
  });
  res.json(users);
};

const findCompanyUser = (req: Request, options = {}) =>
  User.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) }, ...options });

export const getUser = async (req: Request, res: Response) => {
  const user = await findCompanyUser(req, { include: [roleWithPermissions] });
  if (!user) throw new HttpError(404, 'Usuario no encontrado.');
  res.json(user);
};
