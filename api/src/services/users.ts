import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { env } from '../config/env';
import { User } from '../models';
import { HttpError } from '../utils/http';

/** Reglas de las cuentas de usuario, compartidas por perfil, equipo y Panel SRV. */

const BCRYPT_ROUNDS = 10;
export const MIN_PASSWORD = 6;
const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const hashPassword = (password: string) => bcrypt.hash(String(password), BCRYPT_ROUNDS);
export const checkPassword = (password: unknown, hash: string) => bcrypt.compare(String(password), hash);

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
