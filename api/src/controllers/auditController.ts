import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { AuditLog, Company, User } from '../models';
import { deviceOf } from '../services/audit';
import { HttpError } from '../utils/http';

const KINDS = ['login', 'login_failed', 'logout', 'change', 'security', 'download'];
const PAGE_SIZE = 50;

/**
 * Panel de auditoría. El administrador ve lo de su empresa; el equipo de SRV puede ver todas
 * (`scope=all`). Filtros: tipo, persona, fechas y texto libre.
 */
export const listAudit = async (req: Request, res: Response) => {
  const me = req.user!;
  const all = me.isSuperAdmin && req.query.scope === 'all';
  if (!all && !me.companyId) throw new HttpError(403, 'Tu usuario no pertenece a ninguna empresa.');

  const where: WhereOptions = {};
  const and: WhereOptions[] = [];
  if (!all) and.push({ companyId: me.companyId });
  const kind = String(req.query.kind || '');
  if (KINDS.includes(kind)) and.push({ kind });
  const userId = Number(req.query.user) || null;
  if (userId) and.push({ userId });
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  if (DATE.test(String(req.query.from))) and.push({ createdAt: { [Op.gte]: new Date(`${req.query.from}T00:00:00-03:00`) } });
  if (DATE.test(String(req.query.to))) and.push({ createdAt: { [Op.lte]: new Date(`${req.query.to}T23:59:59.999-03:00`) } });
  const q = String(req.query.q || '').trim();
  if (q) and.push({ [Op.or]: [{ summary: { [Op.iLike]: `%${q}%` } }, { username: { [Op.iLike]: `%${q}%` } }, { ip: { [Op.iLike]: `%${q}%` } }] });
  if (and.length) Object.assign(where, { [Op.and]: and });

  const page = Math.max(Number(req.query.page) || 1, 1);
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as number[];
  const companyIds = all ? ([...new Set(rows.map((r) => r.companyId).filter(Boolean))] as number[]) : [];
  const [users, companies] = await Promise.all([
    userIds.length ? User.findAll({ where: { id: userIds }, attributes: ['id', 'username', 'firstname', 'lastname', 'avatarUrl'] }) : [],
    companyIds.length ? Company.findAll({ where: { id: companyIds }, attributes: ['id', 'name'] }) : [],
  ]);

  res.json({
    total: count,
    page,
    pageSize: PAGE_SIZE,
    entries: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      kind: r.kind,
      summary: r.summary,
      status: r.status,
      ip: r.ip,
      device: deviceOf(r.userAgent),
      userAgent: r.userAgent,
      username: r.username,
      user: users.find((u) => u.id === r.userId) ?? null,
      company: companies.find((c) => c.id === r.companyId)?.name ?? null,
      meta: r.meta,
    })),
  });
};
