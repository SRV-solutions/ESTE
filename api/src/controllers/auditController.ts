import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { AuditLog, Company, User } from '../models';
import { deviceOf } from '../services/audit';

const KINDS = ['login', 'login_failed', 'logout', 'change', 'security', 'download'];
const PAGE_SIZE = 50;

/**
 * Panel de auditoría: solo el equipo de SRV, con los registros de todas las empresas.
 * Filtros: empresa, tipo, persona, fechas y texto libre.
 */
export const listAudit = async (req: Request, res: Response) => {
  const where: WhereOptions = {};
  const and: WhereOptions[] = [];
  const companyId = Number(req.query.company) || null;
  if (companyId) and.push({ companyId });
  const kind = String(req.query.kind || '');
  if (KINDS.includes(kind)) and.push({ kind });
  const userId = Number(req.query.user) || null;
  if (userId) and.push({ userId });
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  if (DATE.test(String(req.query.from))) and.push({ createdAt: { [Op.gte]: new Date(`${req.query.from}T00:00:00-03:00`) } });
  if (DATE.test(String(req.query.to))) and.push({ createdAt: { [Op.lte]: new Date(`${req.query.to}T23:59:59.999-03:00`) } });
  const q = String(req.query.q || '').trim();
  if (q) {
    // También encuentra a la persona por nombre, apellido o usuario (los cambios no guardan el usuario escrito).
    const like = { [Op.iLike]: `%${q}%` };
    const people = await User.findAll({ where: { [Op.or]: [{ username: like }, { firstname: like }, { lastname: like }, { email: like }] }, attributes: ['id'], limit: 200 });
    and.push({
      [Op.or]: [{ summary: like }, { username: like }, { ip: like }, ...(people.length ? [{ userId: people.map((p) => p.id) }] : [])],
    });
  }
  if (and.length) Object.assign(where, { [Op.and]: and });

  const page = Math.max(Number(req.query.page) || 1, 1);
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as number[];
  const companyIds = [...new Set(rows.map((r) => r.companyId).filter(Boolean))] as number[];
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
