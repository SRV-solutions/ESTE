import type { Request } from 'express';
import { Op } from 'sequelize';
import { env } from '../config/env';
import { AuditLog } from '../models';
import type { AuditKind } from '../models/AuditLog';

/**
 * Auditoría de Event Box: ingresos (y los intentos fallidos), cambios, descargas de documentos y
 * acciones de seguridad, con la IP y el dispositivo. Nunca se guardan contraseñas ni el cuerpo de los pedidos.
 */

/** IP real del cliente (la app corre detrás de un proxy: `trust proxy` ya está configurado). */
export const clientIp = (req: Request) => String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '').slice(0, 64) || null;

/** "Chrome · Windows", "Safari · iPhone", "App Event Box · Android"… para mostrar en el panel. */
export const deviceOf = (ua: string | null | undefined) => {
  if (!ua) return 'Desconocido';
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Otro';
  const app = /okhttp|Expo|CFNetwork|Dalvik/.test(ua)
    ? 'App Event Box'
    : /Edg\//.test(ua)
      ? 'Edge'
      : /OPR\//.test(ua)
        ? 'Opera'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Chrome\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : /node|curl|PostmanRuntime/i.test(ua)
                ? 'Script / API'
                : 'Navegador';
  return `${app} · ${os}`;
};

interface Entry {
  kind: AuditKind;
  action: string;
  summary: string;
  companyId?: number | null;
  userId?: number | null;
  username?: string | null;
  status?: number | null;
  meta?: Record<string, unknown> | null;
}

/** Guarda un registro. Nunca rompe la operación del usuario si la auditoría falla. */
export const audit = (req: Request, entry: Entry) => {
  AuditLog.create({
    companyId: entry.companyId ?? req.user?.companyId ?? null,
    userId: entry.userId ?? req.user?.id ?? null,
    username: entry.username ?? null,
    kind: entry.kind,
    action: entry.action,
    summary: entry.summary.slice(0, 300),
    method: req.method,
    path: (req.originalUrl || req.url || '').split('?')[0].slice(0, 300),
    status: entry.status ?? null,
    ip: clientIp(req),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300) || null,
    meta: entry.meta ?? null,
  }).catch((err) => console.error('[eventbox] No se pudo guardar la auditoría:', err.message));
};

// ---------- Qué hizo: de la ruta a una frase ----------

type Rule = { kind: AuditKind; label: (p: Record<string, string>, body: Record<string, unknown>) => string };
const R = (kind: AuditKind, label: string | Rule['label']): Rule => ({ kind, label: typeof label === 'string' ? () => label : label });

const STATUS_LABEL: Record<string, string> = {
  created: 'Creada', in_review: 'En revisión', approved: 'Aprobada', rejected: 'Rechazada', in_process: 'Armando', ready: 'Lista',
  dispatched: 'Despachada', delivered: 'En el evento', returning: 'Volviendo', received: 'Recibida', under_review: 'Revisando material', disassembled: 'Desarmada',
};

/** Clave: "MÉTODO /ruta/:param" tal como está declarada en routes/index.ts. */
const RULES: Record<string, Rule> = {
  'POST /service-orders': R('change', 'Creó una orden de servicio'),
  'PATCH /service-orders/:id': R('change', (p) => `Editó la orden #${p.id}`),
  'PATCH /service-orders/:id/status': R('change', (p, b) => `Pasó la orden #${p.id} a "${STATUS_LABEL[String(b.status)] ?? b.status}"`),
  'POST /service-orders/:id/items': R('change', (p) => `Agregó material a la orden #${p.id}`),
  'DELETE /service-orders/:id/items': R('change', (p) => `Vació la orden #${p.id}`),
  'DELETE /service-orders/:id/items/:itemId': R('change', (p) => `Quitó un ítem de la orden #${p.id}`),
  'PUT /service-orders/:id/items/:itemId/swap': R('change', (p) => `Cambió un ítem de la orden #${p.id}`),
  'POST /service-orders/:id/transfer': R('change', (p) => `Pasó el material de la orden #${p.id} a otro evento`),
  'POST /service-orders/:id/containers/:containerId/items': R('change', (p) => `Cargó un contenedor de la orden #${p.id}`),
  'DELETE /service-orders/:id/containers/:containerId/items': R('change', (p) => `Vació un contenedor de la orden #${p.id}`),
  'DELETE /service-orders/:id/containers/:containerId/items/:itemId': R('change', (p) => `Sacó un ítem de un contenedor de la orden #${p.id}`),
  'POST /service-orders/:id/checkins': R('change', (p, b) => `Registró un ${b.kind === 'out' ? 'check-out' : 'check-in'} de la orden #${p.id}`),
  'POST /events': R('change', 'Creó un evento'),
  'PATCH /events/:id': R('change', (p) => `Editó el evento #${p.id}`),
  'POST /events/:id/duplicate': R('change', (p) => `Duplicó el evento #${p.id}`),
  'POST /locations': R('change', 'Creó un lugar'),
  'PATCH /locations/:id': R('change', (p) => `Editó el lugar #${p.id}`),
  'POST /categories': R('change', 'Creó una categoría'),
  'PATCH /categories/:id': R('change', (p) => `Editó la categoría #${p.id}`),
  'PATCH /categories/:id/toggle': R('change', (p) => `Activó o desactivó la categoría #${p.id}`),
  'POST /items': R('change', 'Agregó ítems al stock'),
  'POST /items/import': R('change', 'Importó stock desde un CSV'),
  'PATCH /items/:id': R('change', (p) => `Editó el ítem #${p.id}`),
  'DELETE /items/:id': R('change', (p) => `Borró el ítem #${p.id}`),
  'POST /containers/contents': R('change', 'Cargó contenido fijo en un contenedor'),
  'DELETE /containers/:parentId/contents': R('change', 'Vació el contenido fijo de un contenedor'),
  'DELETE /containers/:parentId/contents/:childId': R('change', 'Sacó un ítem del contenido fijo de un contenedor'),
  'POST /blueprints': R('change', 'Subió un plano'),
  'DELETE /blueprints/:id': R('change', (p) => `Borró el plano #${p.id}`),
  'GET /blueprints/:id/file': R('download', (p) => `Abrió el plano #${p.id}`),
  'POST /payslips': R('change', 'Cargó un recibo de sueldo'),
  'DELETE /payslips/:id': R('change', (p) => `Borró el recibo #${p.id}`),
  'POST /payslips/:id/paper': R('change', (p) => `Marcó el recibo #${p.id} como firmado en papel`),
  'GET /payslips/:id/file': R('download', (p) => `Abrió el recibo de sueldo #${p.id}`),
  'POST /me/payslips/:id/sign': R('change', (p, b) => `Firmó su recibo #${p.id}${b.agree === false ? ' en disconformidad' : ''}`),
  'POST /team': R('security', 'Agregó una persona al equipo'),
  'PATCH /team/:id': R('security', (p) => `Editó los datos o el acceso de la persona #${p.id}`),
  'PATCH /team/:id/disabled': R('security', (p, b) => `${b.disabled === false ? 'Reactivó' : 'Desactivó'} a la persona #${p.id}`),
  'DELETE /team/:id': R('security', (p) => `Eliminó a la persona #${p.id}`),
  'POST /roles': R('security', 'Creó un rol'),
  'PATCH /roles/:id': R('security', (p) => `Cambió los permisos del rol #${p.id}`),
  'DELETE /roles/:id': R('security', (p) => `Borró el rol #${p.id}`),
  'PATCH /me': R('change', 'Editó su perfil'),
  'PUT /me/password': R('security', 'Cambió su contraseña'),
  'POST /me/avatar': R('change', 'Cambió su foto de perfil'),
  'DELETE /me/avatar': R('change', 'Quitó su foto de perfil'),
  'PATCH /company': R('change', 'Editó los datos de la empresa'),
  'POST /company/logo': R('change', 'Cambió el logo de la empresa'),
  'DELETE /company/logo': R('change', 'Quitó el logo de la empresa'),
  'PATCH /company/plan': R('security', (_p, b) => `Cambió el plan de la empresa${b.plan ? ` a ${b.plan}` : ''}`),
  'POST /feedback': R('change', 'Reportó un problema a SRV'),
  'POST /auth/link': R('security', 'Generó un QR para entrar en el celular'),
  'POST /platform/companies': R('security', 'SRV: dio de alta una empresa'),
  'PATCH /platform/companies/:id': R('security', (p) => `SRV: editó la empresa #${p.id}`),
  'POST /platform/companies/:id/payments': R('security', (p) => `SRV: registró un pago de la empresa #${p.id}`),
};

/** "/team/:id/disabled" + "/team/12/disabled" → { id: "12" }. */
const paramsFrom = (pattern: string, path: string) => {
  const keys = pattern.split('/');
  const values = path.split('/');
  const out: Record<string, string> = {};
  keys.forEach((k, i) => {
    if (k.startsWith(':')) out[k.slice(1)] = decodeURIComponent(values[i] ?? '');
  });
  return out;
};

/** GET que se registran (abrir documentos privados). El resto de las lecturas, no. */
const AUDITED_GETS = new Set(['GET /blueprints/:id/file', 'GET /payslips/:id/file']);

/**
 * Middleware: al terminar cada pedido de un usuario con sesión, si cambió algo (o abrió un documento
 * privado) se guarda qué hizo. También quedan los intentos rechazados (403, 409…), útiles para seguridad.
 */
export const auditRequests = (req: Request, res: import('express').Response, next: import('express').NextFunction) => {
  res.on('finish', () => {
    if (!req.user || !req.route) return;
    const key = `${req.method} ${(req.baseUrl || '') + req.route.path}`;
    if (req.method === 'GET' && !AUDITED_GETS.has(key)) return;
    if (req.method === 'OPTIONS' || req.method === 'HEAD') return;
    if (key === 'POST /auth/logout') return; // se registra en el controlador
    const rule = RULES[key];
    // Al terminar el pedido Express ya limpió req.params: se sacan de la URL con el patrón de la ruta.
    const params = paramsFrom((req.baseUrl || '') + req.route.path, (req.originalUrl || '').split('?')[0]);
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const ok = res.statusCode < 400;
    const summary = rule ? rule.label(params, body) : `${req.method} ${req.route.path}`;
    audit(req, {
      kind: rule?.kind ?? 'change',
      action: key,
      summary: ok ? summary : `Intentó: ${summary.charAt(0).toLowerCase()}${summary.slice(1)} (rechazado)`,
      status: res.statusCode,
    });
  });
  next();
};

/** Borra lo más viejo que el período de retención (por defecto, un año). */
export const pruneAudit = async () => {
  const days = env.audit.retentionDays;
  if (!days) return;
  const removed = await AuditLog.destroy({ where: { createdAt: { [Op.lt]: new Date(Date.now() - days * 86400_000) } } });
  if (removed) console.log(`[eventbox] Auditoría: ${removed} registros de más de ${days} días eliminados.`);
};
