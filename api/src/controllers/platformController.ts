import { Request, Response } from 'express';
import { literal, Op } from 'sequelize';
import { sequelize } from '../config/database';
import { env } from '../config/env';
import { getPlan, PLANS } from '../config/plans';
import { Company, Feedback, Invoice, Payment, Role, User } from '../models';
import { isArcaConfigured } from '../services/arca';
import { invoicePayment, registerManualPayment } from '../services/billing';
import { getBlueRate, usdToArs } from '../services/dollar';
import { button, details, isEmailConfigured, paragraph, sendEmail } from '../services/email';
import { cloneTemplateRoles } from '../services/roles';
import { isR2Configured } from '../services/storage';
import { isMercadoPagoConfigured } from '../services/mercadopago';
import { addDays, subscriptionState, todayAR } from '../services/subscription';
import { HttpError, parseId } from '../utils/http';
import { parseCompanyInput } from '../utils/companyInput';
import { EMAIL_RE, hashPassword } from '../services/users';

const count = (table: string, extra = '') =>
  literal(`(SELECT COUNT(*) FROM "${table}" x WHERE x."companyId" = "Company"."id" ${extra})::int`);

const withState = (company: Company) => ({ ...company.toJSON(), subscription: subscriptionState(company) });

/** Resumen de la plataforma: empresas, ingresos y estado de las integraciones. */
export const overview = async (_req: Request, res: Response) => {
  const companies = await Company.findAll();
  const states = companies.map((c) => subscriptionState(c).state);
  const rate = await getBlueRate().catch(() => null);
  const mrrUsd = companies.filter((c, i) => c.status === 'active' && states[i] !== 'blocked').reduce((s, c) => s + Number(c.monthlyPriceUsd), 0);
  const since = new Date(Date.now() - 30 * 86400_000);
  const [collected, openFeedback] = await Promise.all([
    Payment.sum('amountArs', { where: { status: 'approved', paidAt: { [Op.gte]: since } } }),
    Feedback.count({ where: { status: 'open' } }),
  ]);
  res.json({
    openFeedback,
    companies: companies.length,
    byState: { active: 0, grace: 0, blocked: 0, suspended: 0, ...Object.fromEntries(['active', 'grace', 'blocked', 'suspended'].map((s) => [s, states.filter((x) => x === s).length])) },
    mrrUsd,
    mrrArs: rate ? usdToArs(mrrUsd, rate.sell) : null,
    collectedLast30DaysArs: Number(collected || 0),
    rate,
    integrations: {
      mercadoPago: isMercadoPagoConfigured(),
      arca: isArcaConfigured(),
      arcaProduction: env.arca.production,
      r2: isR2Configured(),
      email: isEmailConfigured(),
    },
  });
};

export const listCompanies = async (_req: Request, res: Response) => {
  const companies = await Company.findAll({
    attributes: {
      include: [
        [count('User'), 'userCount'],
        [count('Item'), 'itemCount'],
        [count('ServiceOrder', `AND x.status <> 'disassembled'`), 'activeOrderCount'],
      ],
    },
    order: [['name', 'ASC']],
  });
  res.json(companies.map(withState));
};

const findCompany = async (req: Request) => {
  const company = await Company.findByPk(parseId(req.params.id));
  if (!company) throw new HttpError(404, 'Empresa no encontrada.');
  return company;
};

export const getCompany = async (req: Request, res: Response) => {
  const company = await findCompany(req);
  const [payments, invoices, admins] = await Promise.all([
    Payment.findAll({ where: { companyId: company.id }, include: [Invoice], order: [['createdAt', 'DESC']], limit: 50 }),
    Invoice.findAll({ where: { companyId: company.id }, order: [['createdAt', 'DESC']], limit: 50 }),
    User.findAll({ where: { companyId: company.id, roleId: env.adminRoleId }, attributes: ['id', 'username', 'email', 'firstname', 'lastname'] }),
  ]);
  res.json({ ...withState(company), payments, invoices, admins });
};

/** Alta de una empresa junto con su primer administrador (que después crea al resto). */
export const createCompany = async (req: Request, res: Response) => {
  const data = parseCompanyInput(req.body);
  const admin = req.body.admin || {};
  const username = String(admin.username || '').trim();
  const email = String(admin.email || '').trim();
  const password = String(admin.password || '');
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) throw new HttpError(400, 'Usuario del administrador inválido.', { username: 'Solo letras, números, puntos y guiones.' });
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Email del administrador inválido.', { email: 'Email inválido.' });
  if (password.length < 8) throw new HttpError(400, 'La contraseña del administrador debe tener al menos 8 caracteres.', { password: 'Mínimo 8 caracteres.' });
  const plan = PLANS.find((p) => p.id === req.body.plan) ?? getPlan('profesional');
  // Precio del plan, salvo que SRV le ponga uno especial.
  const price = req.body.monthlyPriceUsd !== undefined && req.body.monthlyPriceUsd !== '' ? Number(req.body.monthlyPriceUsd) : plan.priceUsd;
  if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'Precio mensual inválido.');

  const company = await sequelize.transaction(async (t) => {
    const c = await Company.create(
      { ...data, plan: plan.id, monthlyPriceUsd: price, status: 'active', paidUntil: addDays(todayAR(), env.billing.trialDays) },
      { transaction: t },
    );
    await cloneTemplateRoles(c.id, t);
    await User.create(
      {
        companyId: c.id,
        username,
        email,
        firstname: String(admin.firstname || '').trim() || null,
        lastname: String(admin.lastname || '').trim() || null,
        password: await hashPassword(password),
        roleId: env.adminRoleId,
      },
      { transaction: t },
    );
    return c;
  });

  // La contraseña no viaja por mail: se la pasa SRV por otro medio.
  void sendEmail({
    to: email,
    subject: `Bienvenidos a Event Box, ${company.name}`,
    title: '¡Ya tienen Event Box!',
    body:
      paragraph(`Hola ${String(admin.firstname || '').trim() || username}, creamos la cuenta de ${company.name} en Event Box.`) +
      details([
        ['Tu usuario', username],
        ['Tu rol', 'Administrador de la empresa'],
        ['Plan', `${plan.name} (hasta ${plan.maxUsers} usuarios)`],
        ['Período de prueba', `${env.billing.trialDays} días`],
      ]) +
      paragraph('La contraseña inicial te la pasamos aparte. Al entrar, podés cambiarla desde Mi perfil.') +
      button('Entrar a Event Box', `${env.appUrl}/login`) +
      paragraph('Desde Mi empresa podés subir el logo, cargar los datos para la factura y crear los usuarios de tu equipo.'),
  });

  res.status(201).json(withState(company));
};

export const updateCompany = async (req: Request, res: Response) => {
  const company = await findCompany(req);
  const updates: Record<string, unknown> = parseCompanyInput(req.body, true);
  if (req.body.status !== undefined) {
    if (!['active', 'suspended'].includes(req.body.status)) throw new HttpError(400, 'Estado inválido.');
    updates.status = req.body.status;
  }
  if (req.body.plan !== undefined && req.body.plan !== company.plan) {
    const plan = PLANS.find((p) => p.id === req.body.plan);
    if (!plan) throw new HttpError(400, 'Plan inválido.');
    updates.plan = plan.id;
    updates.monthlyPriceUsd = plan.priceUsd; // Si además mandan un precio especial, lo pisa abajo.
  }
  if (req.body.monthlyPriceUsd !== undefined && req.body.monthlyPriceUsd !== '' && (req.body.plan === undefined || req.body.plan === company.plan || Number(req.body.monthlyPriceUsd) !== Number(company.monthlyPriceUsd))) {
    const price = Number(req.body.monthlyPriceUsd);
    if (!Number.isFinite(price) || price < 0) throw new HttpError(400, 'Precio mensual inválido.');
    updates.monthlyPriceUsd = price;
  }
  if (req.body.paidUntil !== undefined) {
    if (req.body.paidUntil !== null && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.paidUntil)) throw new HttpError(400, 'Fecha inválida.');
    updates.paidUntil = req.body.paidUntil;
  }
  await company.update(updates);
  res.json(withState(company));
};

export const addManualPayment = async (req: Request, res: Response) => {
  const company = await findCompany(req);
  const result = await registerManualPayment(company, { invoice: req.body.invoice !== false });
  res.status(201).json(result);
};

export const retryInvoice = async (req: Request, res: Response) => {
  if (!isArcaConfigured()) throw new HttpError(503, 'ARCA no está configurado en el servidor.');
  res.json(await invoicePayment(parseId(req.params.paymentId)));
};

/** Roles disponibles (para mostrar en el panel). */
export const listRoles = async (_req: Request, res: Response) => {
  res.json(await Role.findAll({ order: [['id', 'ASC']] }));
};
