import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { tenant } from '../middlewares/auth';

/**
 * Reportes y estadísticas de uso del stock (plan Empresa). Todo sale de consultas agregadas
 * sobre las órdenes, los eventos y los ítems de la empresa en el período pedido.
 */

const q = <T extends object>(sql: string, replacements: Record<string, unknown>) => sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });

export const overview = async (req: Request, res: Response) => {
  const companyId = tenant(req);
  const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);
  const r = { companyId, months };

  const [ordersByMonth, ordersByStatus, topCategories, topItems, topLocations, topPeople, stock, cycle, checkins] = await Promise.all([
    q<{ month: string; total: number; disassembled: number }>(
      `SELECT to_char(d, 'YYYY-MM') AS month,
              COUNT(o.id)::int AS total,
              COUNT(o.id) FILTER (WHERE o.status = 'disassembled')::int AS disassembled
         FROM generate_series(date_trunc('month', now()) - (:months - 1) * interval '1 month', date_trunc('month', now()), interval '1 month') d
         LEFT JOIN "ServiceOrder" o ON o."companyId" = :companyId AND date_trunc('month', o."createdDate") = d
        GROUP BY d ORDER BY d`,
      r,
    ),
    q<{ status: string; total: number }>(`SELECT status, COUNT(*)::int AS total FROM "ServiceOrder" WHERE "companyId" = :companyId GROUP BY status`, r),
    q<{ id: number; name: string; code: string; times: number; orders: number }>(
      `SELECT c.id, c.name, c.code, COUNT(soi.id)::int AS times, COUNT(DISTINCT o.id)::int AS orders
         FROM "ServiceOrderItem" soi
         JOIN "ServiceOrder" o ON o.id = soi."serviceOrderId" AND o."companyId" = :companyId
          AND o."createdDate" >= date_trunc('month', now()) - (:months - 1) * interval '1 month'
         JOIN "Item" i ON i.id = soi."itemId"
         JOIN "Category" c ON c.id = i."categoryId"
        GROUP BY c.id ORDER BY times DESC LIMIT 10`,
      r,
    ),
    q<{ id: number; code: string; category: string; uses: number; isActive: boolean }>(
      `SELECT i.id, i.code, c.name AS category, COALESCE(i.uses, 0)::int AS uses, i."isActive"
         FROM "Item" i JOIN "Category" c ON c.id = i."categoryId"
        WHERE i."companyId" = :companyId AND COALESCE(i.uses, 0) > 0
        ORDER BY i.uses DESC, i.code LIMIT 10`,
      r,
    ),
    q<{ id: number; name: string; city: string; events: number; orders: number }>(
      `SELECT l.id, l."locationName" AS name, l.city, COUNT(DISTINCT e.id)::int AS events, COUNT(DISTINCT o.id)::int AS orders
         FROM "Event" e
         JOIN "Location" l ON l.id = e."locationId"
         LEFT JOIN "ServiceOrder" o ON o."eventId" = e.id
        WHERE e."companyId" = :companyId AND e."dateEvent" >= date_trunc('month', now()) - (:months - 1) * interval '1 month'
        GROUP BY l.id ORDER BY events DESC, orders DESC LIMIT 8`,
      r,
    ),
    q<{ id: number; username: string; firstname: string | null; lastname: string | null; orders: number }>(
      `SELECT u.id, u.username, u.firstname, u.lastname, COUNT(o.id)::int AS orders
         FROM "ServiceOrder" o JOIN "User" u ON u.id = o."orderedBy"
        WHERE o."companyId" = :companyId AND o."createdDate" >= date_trunc('month', now()) - (:months - 1) * interval '1 month'
        GROUP BY u.id ORDER BY orders DESC LIMIT 8`,
      r,
    ),
    q<{ items: number; activeItems: number; categories: number; containers: number; inUse: number; neverUsed: number }>(
      `SELECT (SELECT COUNT(*) FROM "Item" WHERE "companyId" = :companyId)::int AS items,
              (SELECT COUNT(*) FROM "Item" WHERE "companyId" = :companyId AND "isActive")::int AS "activeItems",
              (SELECT COUNT(*) FROM "Category" WHERE "companyId" = :companyId AND "isActive")::int AS categories,
              (SELECT COUNT(*) FROM "Item" i JOIN "Category" c ON c.id = i."categoryId" WHERE i."companyId" = :companyId AND c."isContainer")::int AS containers,
              (SELECT COUNT(DISTINCT soi."itemId") FROM "ServiceOrderItem" soi JOIN "ServiceOrder" o ON o.id = soi."serviceOrderId"
                WHERE o."companyId" = :companyId AND o.status <> 'disassembled' AND soi."isActive")::int AS "inUse",
              (SELECT COUNT(*) FROM "Item" WHERE "companyId" = :companyId AND "isActive" AND COALESCE(uses, 0) = 0)::int AS "neverUsed"`,
      r,
    ),
    q<{ avgDays: number | null; closed: number }>(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (o."disassemblyDate" - o."createdDate"::timestamp)) / 86400)::numeric, 1)::float AS "avgDays",
              COUNT(*)::int AS closed
         FROM "ServiceOrder" o
        WHERE o."companyId" = :companyId AND o.status = 'disassembled' AND o."disassemblyDate" IS NOT NULL
          AND o."createdDate" >= date_trunc('month', now()) - (:months - 1) * interval '1 month'`,
      r,
    ),
    q<{ total: number; onSite: number; ins: number; outs: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "onSite")::int AS "onSite",
              COUNT(*) FILTER (WHERE kind = 'in')::int AS ins, COUNT(*) FILTER (WHERE kind = 'out')::int AS outs
         FROM "CheckIn" WHERE "companyId" = :companyId AND "createdAt" >= date_trunc('month', now()) - (:months - 1) * interval '1 month'`,
      r,
    ),
  ]);

  res.json({ months, ordersByMonth, ordersByStatus, topCategories, topItems, topLocations, topPeople, stock: stock[0], cycle: cycle[0], checkins: checkins[0] });
};
