import { Op, Transaction } from 'sequelize';
import { env } from '../config/env';
import { Role, RolePermission } from '../models';

/** Copia a una empresa nueva los roles plantilla (los globales, salvo el Administrador). */
export const cloneTemplateRoles = async (companyId: number, transaction: Transaction) => {
  const templates = await Role.findAll({ where: { companyId: null, id: { [Op.ne]: env.adminRoleId } }, order: [['id', 'ASC']], transaction });
  for (const template of templates) {
    const role = await Role.create({ roleName: template.roleName, description: template.description, companyId }, { transaction });
    const perms = await RolePermission.findAll({ where: { roleId: template.id }, transaction });
    await RolePermission.bulkCreate(
      perms.map((p) => ({ roleId: role.id, permissionId: p.permissionId })),
      { transaction },
    );
  }
};
