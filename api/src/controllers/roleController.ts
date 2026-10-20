import { Request, Response } from 'express';
import { literal, Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { env } from '../config/env';
import { tenant } from '../middlewares/auth';
import { Permission, Role, RolePermission } from '../models';
import { HttpError, parseId } from '../utils/http';

/**
 * Roles de cada empresa. El Administrador es global, tiene todos los permisos y no se edita;
 * el resto es de la empresa y lo maneja su administrador.
 */

const USER_COUNT = literal(`(SELECT COUNT(*) FROM "User" u WHERE u."roleId" = "Role"."id" AND u."companyId" = "Role"."companyId")::int`);

const companyRoles = (companyId: number) => ({ [Op.or]: [{ companyId }, { id: env.adminRoleId }] });

export const listRoles = async (req: Request, res: Response) => {
  const roles = await Role.findAll({
    where: companyRoles(tenant(req)),
    attributes: { include: [[USER_COUNT, 'userCount']] },
    include: [{ model: Permission, attributes: ['entity', 'action'], through: { attributes: [] } }],
    order: [['id', 'ASC']],
  });
  res.json(
    roles.map((r) => ({
      id: r.id,
      roleName: r.roleName,
      description: r.description,
      locked: r.id === env.adminRoleId,
      userCount: r.id === env.adminRoleId ? null : (r.get('userCount') as number),
      permissions: (r.Permissions || []).map((p) => `${p.entity}.${p.action}`),
    })),
  );
};

export const getRole = async (req: Request, res: Response) => {
  const role = await Role.findOne({
    where: { id: parseId(req.params.id), ...companyRoles(tenant(req)) },
    include: [{ model: Permission, through: { attributes: [] } }],
  });
  if (!role) throw new HttpError(404, 'Rol no encontrado.');
  res.json(role);
};

/** Valida nombre y permisos ("entidad.acción"); devuelve los ids de los permisos. */
const parseRole = async (req: Request, currentId?: number) => {
  const roleName = String(req.body.roleName ?? '').trim();
  const description = String(req.body.description ?? '').trim() || null;
  if (roleName.length < 2) throw new HttpError(400, 'Poné un nombre para el rol.', { roleName: 'Obligatorio.' });
  const taken = await Role.findOne({
    where: {
      [Op.and]: [
        companyRoles(tenant(req)),
        sequelize.where(sequelize.fn('lower', sequelize.col('roleName')), roleName.toLowerCase()),
        currentId ? { id: { [Op.ne]: currentId } } : {},
      ],
    },
  });
  if (taken) throw new HttpError(409, 'Ya hay un rol con ese nombre.', { roleName: 'Nombre repetido.' });

  const keys: string[] = Array.isArray(req.body.permissions) ? req.body.permissions.map(String) : [];
  const all = await Permission.findAll();
  const ids = all.filter((p) => keys.includes(`${p.entity}.${p.action}`)).map((p) => p.id);
  if (ids.length !== new Set(keys).size) throw new HttpError(400, 'Hay permisos que no existen.');
  return { roleName, description, ids };
};

const setPermissions = async (roleId: number, ids: number[], transaction: Transaction) => {
  await RolePermission.destroy({ where: { roleId }, transaction });
  if (ids.length) await RolePermission.bulkCreate(ids.map((permissionId) => ({ roleId, permissionId })), { transaction });
};

const findEditable = async (req: Request) => {
  const id = parseId(req.params.id);
  if (id === env.adminRoleId) throw new HttpError(400, 'El rol Administrador tiene todos los permisos y no se modifica.');
  const role = await Role.findOne({ where: { id, companyId: tenant(req) } });
  if (!role) throw new HttpError(404, 'Rol no encontrado.');
  return role;
};

export const createRole = async (req: Request, res: Response) => {
  const { roleName, description, ids } = await parseRole(req);
  const role = await sequelize.transaction(async (transaction) => {
    const created = await Role.create({ roleName, description, companyId: tenant(req) }, { transaction });
    await setPermissions(created.id, ids, transaction);
    return created;
  });
  res.status(201).json({ id: role.id, message: `Rol ${roleName} creado.` });
};

export const updateRole = async (req: Request, res: Response) => {
  const role = await findEditable(req);
  const { roleName, description, ids } = await parseRole(req, role.id);
  await sequelize.transaction(async (transaction) => {
    await role.update({ roleName, description }, { transaction });
    await setPermissions(role.id, ids, transaction);
  });
  res.json({ message: 'Rol actualizado. Los permisos nuevos rigen desde la próxima acción de cada persona.' });
};

export const deleteRole = async (req: Request, res: Response) => {
  const role = await findEditable(req);
  const [row] = await sequelize.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM "User" WHERE "roleId" = :id', {
    replacements: { id: role.id },
    type: 'SELECT' as never,
  });
  if (row.n > 0) throw new HttpError(409, `Hay ${row.n} persona${row.n === 1 ? '' : 's'} con este rol: pasalas a otro antes de borrarlo.`);
  await role.destroy();
  res.json({ message: `Rol ${role.roleName} eliminado.` });
};
