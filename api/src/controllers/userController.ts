import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { env } from '../config/env';
import { assertCanLogin, signToken, tenant } from '../middlewares/auth';
import { getPlan, IN_DEVELOPMENT } from '../config/plans';
import { Company, PasswordResetToken, Permission, Role, User } from '../models';
import { hasLogin } from '../models/User';
import { countAppUsers } from '../services/team';
import { button, paragraph, sendEmail } from '../services/email';
import { deleteByUrl, saveImage } from '../services/storage';
import { subscriptionState } from '../services/subscription';
import { HttpError, parseId } from '../utils/http';

export const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD = 6;
const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleWithPermissions = { model: Role, include: [{ model: Permission, through: { attributes: [] } }] };
const sessionIncludes = [roleWithPermissions, { model: Company }];
const ROLE_BRIEF = { model: Role, attributes: ['id', 'roleName'] };

/** Forma única del usuario autenticado (login y perfil devuelven lo mismo). */
const toSession = async (user: User) => {
  const plan = user.Company ? getPlan(user.Company.plan) : null;
  const userCount = user.companyId ? await countAppUsers(user.companyId) : 0;
  return {
    ...baseSession(user),
    plan: plan
      ? { id: plan.id, name: plan.name, features: plan.features, inDevelopment: IN_DEVELOPMENT, maxUsers: plan.maxUsers, maxTemporary: plan.maxTemporary, userCount }
      : null,
  };
};

const baseSession = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email,
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

type FieldErrors = Record<string, string>;

/** Valida username/email/nombres y que username y email no estén tomados por otro usuario. */
export const validateProfile = async (
  data: { username?: string; email?: string; firstname?: string; lastname?: string },
  currentUserId?: number,
) => {
  const errors: FieldErrors = {};
  if (data.username !== undefined && !USERNAME_RE.test(data.username)) {
    errors.username = 'Solo letras, números, puntos, guiones y guiones bajos.';
  }
  if (data.email !== undefined && !EMAIL_RE.test(data.email)) {
    errors.email = 'Email inválido.';
  }
  if (data.firstname && data.firstname.trim().length < 2) errors.firstname = 'Mínimo 2 caracteres.';
  if (data.lastname && data.lastname.trim().length < 2) errors.lastname = 'Mínimo 2 caracteres.';

  const lookups = [];
  if (data.username && !errors.username) lookups.push({ username: data.username });
  if (data.email && !errors.email) lookups.push({ email: data.email });
  if (lookups.length) {
    const taken = await User.findAll({
      where: { [Op.or]: lookups, ...(currentUserId ? { id: { [Op.ne]: currentUserId } } : {}) },
    });
    if (taken.some((u) => u.username === data.username)) errors.username = 'Ese nombre de usuario ya está en uso.';
    if (taken.some((u) => u.email === data.email)) errors.email = 'Ese email ya está registrado.';
  }

  if (Object.keys(errors).length) throw new HttpError(400, 'Revisá los datos del formulario.', errors);
};

export const assertPassword = (password: unknown, field = 'password') => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new HttpError(400, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`, {
      [field]: `Mínimo ${MIN_PASSWORD} caracteres.`,
    });
  }
};

/** Cada empresa tiene que conservar al menos un administrador. */
export const assertNotLastAdmin = async (user: User) => {
  const admins = await User.count({ where: { companyId: user.companyId, roleId: env.adminRoleId, access: 'app' } });
  if (admins <= 1) throw new HttpError(409, 'Es el único administrador de la empresa: asigná otro antes de cambiarle el rol.');
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) throw new HttpError(400, 'Ingresá usuario y contraseña.');

  const user = await User.scope('withPassword').findOne({ where: { username }, include: sessionIncludes });
  // Mismo mensaje para usuario inexistente y contraseña incorrecta: no revela qué usuarios existen.
  if (!user?.password || !(await bcrypt.compare(String(password), user.password))) {
    throw new HttpError(401, 'Usuario o contraseña incorrectos.');
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
  await validateProfile({ username, email, firstname, lastname }, user.id);

  await user.update({
    username: username ?? user.username,
    email: email ?? user.email,
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

  if (!currentPassword || !(await bcrypt.compare(String(currentPassword), user.password))) {
    throw new HttpError(400, 'La contraseña actual es incorrecta.', { currentPassword: 'Contraseña incorrecta.' });
  }
  assertPassword(newPassword, 'newPassword');

  await user.update({ password: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) });
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
  if (!identifier) throw new HttpError(400, 'Ingresá tu usuario o tu email.');

  const user = await User.findOne({ where: { [Op.or]: [{ username: identifier }, { email: identifier.toLowerCase() }, { email: identifier }] } });
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

export const resetPassword = async (req: Request, res: Response) => {
  const token = String(req.body.token || '');
  const record = token ? await PasswordResetToken.findOne({ where: { tokenHash: sha256(token) } }) : null;
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'El link no es válido o ya venció. Pedí uno nuevo.');
  }
  assertPassword(req.body.password);

  await sequelize.transaction(async (transaction) => {
    await User.update({ password: await bcrypt.hash(req.body.password, BCRYPT_ROUNDS) }, { where: { id: record.userId }, transaction });
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
