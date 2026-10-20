import { Request, Response } from 'express';
import { FEATURES, getPlan, IN_DEVELOPMENT, PlanId, PLANS } from '../config/plans';
import { Company } from '../models';
import { countAppUsers } from '../services/team';
import { HttpError } from '../utils/http';

/** Catálogo de planes y módulos (para la pantalla de planes y los candados del menú). */
export const listPlans = (_req: Request, res: Response) => {
  res.json({ plans: PLANS, features: FEATURES, inDevelopment: IN_DEVELOPMENT });
};

/** Uso actual frente al límite del plan. */
export const planUsage = async (companyId: number, planId: string) => {
  const users = await countAppUsers(companyId);
  return { users, maxUsers: getPlan(planId).maxUsers };
};

/**
 * El administrador cambia el plan de su empresa. El precio nuevo se cobra desde el próximo pago.
 * No se puede bajar a un plan con menos usuarios de los que ya tiene.
 */
export const changeMyPlan = async (req: Request, res: Response) => {
  const planId = String(req.body.plan) as PlanId;
  const plan = PLANS.find((p) => p.id === planId);
  if (!plan) throw new HttpError(400, 'Plan inválido.');
  const company = await Company.findByPk(req.user!.companyId!);
  if (!company) throw new HttpError(404, 'Empresa no encontrada.');

  const { users } = await planUsage(company.id, plan.id);
  if (users > plan.maxUsers) {
    throw new HttpError(409, `Tu empresa tiene ${users} usuarios y el plan ${plan.name} permite ${plan.maxUsers}. Pasá a "sin acceso" a quienes no usan la app antes de cambiar.`);
  }
  await company.update({ plan: plan.id, monthlyPriceUsd: plan.priceUsd });
  res.json({ message: `Listo: ahora están en el plan ${plan.name}. El nuevo precio se aplica desde el próximo pago.`, company });
};
