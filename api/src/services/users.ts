import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { env } from '../config/env';
import { Company, LoginLinkToken, User } from '../models';
import { HttpError } from '../utils/http';
import { button, details, paragraph, sendEmail } from './email';

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

// Sin letras ni números que se confunden al copiarla del mail (0/O, 1/l/I).
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Contraseña temporal de 10 caracteres: la persona la usa para entrar la primera vez y la cambia. */
export const generateTemporaryPassword = () => Array.from({ length: 10 }, () => TEMP_ALPHABET[crypto.randomInt(TEMP_ALPHABET.length)]).join('');

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const MAIL_LINK_TTL_MS = 72 * 60 * 60 * 1000;

/**
 * Link de un solo uso para entrar directo desde el mail (vale 72 horas). Se guarda hasheado.
 * Los links anteriores de la persona dejan de servir: solo vale el del último mail.
 */
export const createMailLoginLink = async (userId: number) => {
  const token = crypto.randomBytes(32).toString('hex');
  await LoginLinkToken.update({ usedAt: new Date() }, { where: { userId, usedAt: null } });
  await LoginLinkToken.create({ userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + MAIL_LINK_TTL_MS) });
  const link = `${env.appUrl}/login?link=${token}&via=mail`;
  if (!env.isProduction) console.log(`[eventbox] Link de acceso por mail para el usuario #${userId}: ${link}`);
  return link;
};

/**
 * Le manda a la persona su usuario, la contraseña temporal y un botón para entrar directo.
 * Devuelve si el mail salió (sin email o sin Resend configurado, no sale).
 */
export const sendAccessEmail = (
  user: { email: string | null; username: string; firstname: string | null },
  password: string,
  { companyName, isNew = true, link }: { companyName?: string | null; isNew?: boolean; link: string },
) => {
  if (!user.email) return Promise.resolve(false);
  return sendEmail({
    to: user.email,
    subject: isNew ? 'Tu usuario de Event Box' : 'Tu nueva contraseña de Event Box',
    title: isNew ? '¡Ya tenés usuario en Event Box!' : 'Te blanquearon la contraseña',
    body:
      paragraph(
        isNew
          ? `Hola ${user.firstname || user.username}, te crearon un usuario en Event Box${companyName ? ` para ${companyName}` : ''}.`
          : `Hola ${user.firstname || user.username}, un administrador te puso una contraseña nueva en Event Box. La anterior ya no sirve.`,
      ) +
      paragraph('Tocá el botón para entrar directo y elegir tu contraseña. El botón sirve una sola vez y vence en 72 horas.') +
      button('Entrar a Event Box', link) +
      paragraph('Si el botón ya no funciona, entrá con estos datos (también podés usar tu email o tu DNI en lugar del usuario):') +
      details([
        ['Usuario', user.username],
        ['Contraseña temporal', password],
      ]) +
      paragraph('Al entrar te vamos a pedir que elijas una contraseña nueva. Si no esperabas este mail, avisale al administrador de tu empresa.'),
  });
};

/**
 * Le manda la contraseña temporal (con el link para entrar directo) y arma el aviso para quien la creó.
 * Si el mail no sale y la contraseña la generó el sistema, se la devuelve para que la pase por otro medio.
 */
export const deliverTemporaryPassword = async (user: User, password: string, { generated, isNew }: { generated: boolean; isNew: boolean }) => {
  const company = user.companyId ? await Company.findByPk(user.companyId, { attributes: ['name'] }) : null;
  const mailed = user.email ? await sendAccessEmail(user, password, { companyName: company?.name, isNew, link: await createMailLoginLink(user.id) }) : false;
  const why = user.email ? 'No se pudo mandar el mail' : 'No tiene email cargado';
  return {
    mailed,
    note: mailed
      ? ` Le mandamos un mail a ${user.email} con la contraseña temporal y un botón para entrar directo.`
      : ` ${why}: pasale la contraseña ${generated ? 'temporal ' : ''}vos (la cambia al entrar).`,
    temporaryPassword: !mailed && generated ? password : undefined,
  };
};

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
