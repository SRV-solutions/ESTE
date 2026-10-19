import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { env } from '../config/env';
import { signToken, tenant } from '../middlewares/auth';
import { Company, Permission, Role, User } from '../models';
import { subscriptionState } from '../services/subscription';
import { HttpError, parseId } from '../utils/http';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD = 6;
const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleWithPermissions = { model: Role, include: [{ model: Permission, through: { attributes: [] } }] };
const sessionIncludes = [roleWithPermissions, { model: Company }];
const ROLE_BRIEF = { model: Role, attributes: ['id', 'roleName'] };

/** Forma única del usuario autenticado (login y perfil devuelven lo mismo). */
const toSession = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  firstname: user.firstname,
  lastname: user.lastname,
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
const validateProfile = async (
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

const assertPassword = (password: unknown, field = 'password') => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new HttpError(400, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`, {
      [field]: `Mínimo ${MIN_PASSWORD} caracteres.`,
    });
  }
};

/** Cada empresa tiene que conservar al menos un administrador. */
const assertNotLastAdmin = async (user: User) => {
  const admins = await User.count({ where: { companyId: user.companyId, roleId: env.adminRoleId } });
  if (admins <= 1) throw new HttpError(409, 'Es el único administrador de la empresa: asigná otro antes de cambiarle el rol.');
};

const assertRole = async (roleId: unknown) => {
  const role = await Role.findByPk(parseId(roleId, 'rol'));
  if (!role) throw new HttpError(404, 'El rol no existe.');
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) throw new HttpError(400, 'Ingresá usuario y contraseña.');

  const user = await User.scope('withPassword').findOne({ where: { username }, include: sessionIncludes });
  // Mismo mensaje para usuario inexistente y contraseña incorrecta: no revela qué usuarios existen.
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    throw new HttpError(401, 'Usuario o contraseña incorrectos.');
  }

  res.json({ token: signToken(user), user: toSession(user) });
};

export const getMyProfile = async (req: Request, res: Response) => {
  const user = await User.findByPk(req.user!.id, { include: sessionIncludes });
  if (!user) throw new HttpError(404, 'Usuario no encontrado.');
  res.json(toSession(user));
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
  res.json(toSession(fresh!));
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

export const listUsers = async (req: Request, res: Response) => {
  const users = await User.findAll({
    where: { companyId: tenant(req) },
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

export const createUser = async (req: Request, res: Response) => {
  const { username, email, password, roleId, firstname, lastname } = req.body;
  if (!username || !email) throw new HttpError(400, 'Usuario y email son obligatorios.');
  await validateProfile({ username, email, firstname, lastname });
  assertPassword(password);
  await assertRole(roleId);

  const user = await User.create({
    companyId: tenant(req),
    username,
    email,
    firstname: firstname?.trim() || null,
    lastname: lastname?.trim() || null,
    password: await bcrypt.hash(password, BCRYPT_ROUNDS),
    roleId,
  });
  const created = await User.findByPk(user.id, { include: [ROLE_BRIEF] });
  res.status(201).json(created);
};

export const updateUser = async (req: Request, res: Response) => {
  const user = await findCompanyUser(req);
  if (!user) throw new HttpError(404, 'Usuario no encontrado.');

  const { username, email, password, roleId, firstname, lastname } = req.body;
  await validateProfile({ username, email, firstname, lastname }, user.id);
  if (roleId !== undefined && roleId !== user.roleId) {
    await assertRole(roleId);
    if (user.roleId === env.adminRoleId) await assertNotLastAdmin(user);
  }
  if (password) assertPassword(password);

  await user.update({
    username: username ?? user.username,
    email: email ?? user.email,
    firstname: firstname === undefined ? user.firstname : firstname?.trim() || null,
    lastname: lastname === undefined ? user.lastname : lastname?.trim() || null,
    roleId: roleId ?? user.roleId,
    ...(password ? { password: await bcrypt.hash(password, BCRYPT_ROUNDS) } : {}),
  });

  const updated = await User.findByPk(user.id, { include: [ROLE_BRIEF] });
  res.json(updated);
};
