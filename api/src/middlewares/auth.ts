import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Feature, PlanId, planHas, PLANS } from '../config/plans';
import { Company, Permission, Role, User } from '../models';
import { Action, Entity } from '../models/enums';
import { hasLogin } from '../models/User';
import { AccessState, canUseApp, subscriptionState } from '../services/subscription';
import { asyncHandler, HttpError } from '../utils/http';

export interface AuthUser {
  id: number;
  roleId: number;
  companyId: number | null;
  /** Administrador de su empresa. */
  isAdmin: boolean;
  /** Equipo de SRV: administra la plataforma y todas las empresas. */
  isSuperAdmin: boolean;
  permissions: Array<{ entity: string; action: string }>;
  access: AccessState | null;
  plan: PlanId | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

export const signToken = (user: { id: number }) =>
  jwt.sign({ id: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);

export const assertCanLogin = (user: User) => {
  if (hasLogin(user)) return;
  if (user.disabledAt) throw new HttpError(401, 'Tu usuario está desactivado. Hablá con el administrador de tu empresa.');
  if (user.access === 'temporary') throw new HttpError(401, 'Tu acceso temporal venció. Pedile a un administrador que lo renueve.');
  throw new HttpError(401, 'Esta persona no tiene acceso a Event Box.');
};

/** Valida el token y carga usuario, permisos y estado de la empresa en una sola consulta. */
export const isAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'No autorizado. Iniciá sesión.');

  let payload: { id: number | string };
  try {
    payload = jwt.verify(token, env.jwtSecret) as { id: number | string };
  } catch {
    throw new HttpError(401, 'La sesión expiró o el token es inválido.');
  }

  const user = await User.findByPk(Number(payload.id), {
    attributes: ['id', 'roleId', 'companyId', 'isSuperAdmin', 'access', 'accessUntil', 'disabledAt'],
    include: [
      { model: Role, include: [{ model: Permission, through: { attributes: [] } }] },
      { model: Company, attributes: ['id', 'status', 'paidUntil', 'plan'] },
    ],
  });
  if (!user) throw new HttpError(401, 'El usuario ya no existe.');
  // Un acceso temporal que venció (o uno quitado) corta la sesión en el momento, aunque el token siga vigente.
  assertCanLogin(user);

  req.user = {
    id: user.id,
    roleId: user.roleId,
    companyId: user.companyId,
    isAdmin: !!user.companyId && user.roleId === env.adminRoleId,
    isSuperAdmin: user.isSuperAdmin,
    permissions: (user.Role?.Permissions || []).map((p) => ({ entity: p.entity, action: p.action })),
    access: user.Company ? subscriptionState(user.Company).state : null,
    plan: user.Company?.plan ?? null,
  };
  next();
});

/** Exige que el plan de la empresa incluya el módulo (si no, le dice qué plan lo tiene). */
export const requireFeature = (feature: Feature) => (req: Request, _res: Response, next: NextFunction) => {
  if (planHas(req.user?.plan, feature)) return next();
  const needed = PLANS.find((p) => p.features.includes(feature));
  next(new HttpError(403, `Este módulo es parte del plan ${needed?.name ?? 'superior'}. Un administrador puede cambiar el plan desde Mi empresa.`));
};

export const hasPermission = (user: AuthUser | undefined, entity: Entity, action: Action) =>
  !!user?.permissions.some((p) => p.entity === entity && p.action === action);

/** Exige pertenecer a una empresa con la suscripción vigente (o en período de gracia). */
export const requireCompany = (req: Request, _res: Response, next: NextFunction) => {
  const user = req.user!;
  if (!user.companyId) return next(new HttpError(403, 'Tu usuario no pertenece a ninguna empresa.'));
  if (user.access === 'suspended') return next(new HttpError(402, 'La empresa está suspendida. Contactá a SRV.'));
  if (!canUseApp(user.access!)) {
    return next(new HttpError(402, 'La suscripción está vencida. Un administrador de tu empresa tiene que regularizar el pago.'));
  }
  next();
};

export const checkPermission = (entity: Entity, action: Action) => (req: Request, _res: Response, next: NextFunction) => {
  if (!hasPermission(req.user, entity, action)) {
    return next(new HttpError(403, 'Tu rol no tiene permiso para esta acción.'));
  }
  next();
};

export const requireCompanyAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) return next(new HttpError(403, 'Solo el administrador de la empresa puede hacer esto.'));
  next();
};

export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) return next(new HttpError(403, 'Solo el equipo de SRV puede hacer esto.'));
  next();
};

/** Atajo para rutas de la app: sesión + empresa habilitada + permiso. */
export const can = (entity: Entity, action: Action) => [isAuth, requireCompany, checkPermission(entity, action)];

/** Id de la empresa del usuario (solo en rutas protegidas por `can` o `requireCompany`). */
export const tenant = (req: Request) => req.user!.companyId as number;
