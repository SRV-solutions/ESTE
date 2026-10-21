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

/** DNI argentino: 7 u 8 dígitos (se aceptan puntos y se descartan). */
export const normalizeDni = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D/g, '').replace(/^0+/, '');
  return digits || null;
};
export const isValidDni = (dni: string) => /^\d{7,8}$/.test(dni);

/**
 * Busca a quien quiere entrar: por usuario, por email o por DNI.
 * Si lo que escribió son solo dígitos, se prueba como DNI; si tiene @, como email.
 */
export const findByIdentifier = (identifier: string, scope = User) => {
  const value = identifier.trim();
  const or: Record<string, unknown>[] = [{ username: value }];
  if (value.includes('@')) or.push({ email: value }, { email: value.toLowerCase() });
  const dni = normalizeDni(value);
  if (dni && /^[\d.\s]+$/.test(value) && isValidDni(dni)) or.push({ dni });
  return { where: { [Op.or]: or } };
};

export const hashPassword = (password: string) => bcrypt.hash(String(password), BCRYPT_ROUNDS);
export const checkPassword = (password: unknown, hash: string) => bcrypt.compare(String(password), hash);

type FieldErrors = Record<string, string>;

/** Valida username/email/nombres y que username y email no estén tomados por otro usuario. */
export const validateProfile = async (
  data: { username?: string; email?: string; firstname?: string; lastname?: string; dni?: string | null },
  currentUserId?: number,
) => {
  const errors: FieldErrors = {};
  if (data.username !== undefined && !USERNAME_RE.test(data.username)) {
    errors.username = 'Solo letras, números, puntos, guiones y guiones bajos.';
  }
  if (data.email !== undefined && !EMAIL_RE.test(data.email)) {
    errors.email = 'Email inválido.';
  }
  if (data.dni && !isValidDni(data.dni)) errors.dni = 'El DNI tiene 7 u 8 números.';
  if (data.firstname && data.firstname.trim().length < 2) errors.firstname = 'Mínimo 2 caracteres.';
  if (data.lastname && data.lastname.trim().length < 2) errors.lastname = 'Mínimo 2 caracteres.';

  const lookups = [];
  if (data.username && !errors.username) lookups.push({ username: data.username });
  if (data.email && !errors.email) lookups.push({ email: data.email });
  if (data.dni && !errors.dni) lookups.push({ dni: data.dni });
  if (lookups.length) {
    const taken = await User.findAll({
      where: { [Op.or]: lookups, ...(currentUserId ? { id: { [Op.ne]: currentUserId } } : {}) },
    });
    if (taken.some((u) => u.username === data.username)) errors.username = 'Ese nombre de usuario ya está en uso.';
    if (taken.some((u) => u.email === data.email)) errors.email = 'Ese email ya está registrado.';
    if (taken.some((u) => u.dni === data.dni)) errors.dni = 'Ese DNI ya está registrado en otro usuario.';
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
  const admins = await User.count({ where: { companyId: user.companyId, roleId: env.adminRoleId, access: 'app', disabledAt: null } });
  if (admins <= 1) throw new HttpError(409, 'Es el único administrador de la empresa: asigná otro antes de cambiarle el rol.');
};
