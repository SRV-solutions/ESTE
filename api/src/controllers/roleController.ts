import { Request, Response } from 'express';
import { Permission, Role } from '../models';
import { HttpError, parseId } from '../utils/http';

export const listRoles = async (_req: Request, res: Response) => {
  res.json(await Role.findAll({ order: [['id', 'ASC']] }));
};

export const getRole = async (req: Request, res: Response) => {
  const role = await Role.findByPk(parseId(req.params.id), {
    include: [{ model: Permission, through: { attributes: [] } }],
  });
  if (!role) throw new HttpError(404, 'Rol no encontrado.');
  res.json(role);
};

export const createRole = async (req: Request, res: Response) => {
  const { roleName, description } = req.body;
  if (!roleName?.trim()) throw new HttpError(400, 'El nombre del rol es obligatorio.');
  const role = await Role.create({ roleName: roleName.trim(), description: description?.trim() || null });
  res.status(201).json(role);
};
