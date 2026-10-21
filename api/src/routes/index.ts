import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as billing from '../controllers/billingController';
import * as blueprints from '../controllers/blueprintController';
import * as payroll from '../controllers/payrollController';
import * as plans from '../controllers/planController';
import * as categories from '../controllers/categoryController';
import * as checkins from '../controllers/checkinController';
import * as events from '../controllers/eventController';
import * as feedback from '../controllers/feedbackController';
import * as items from '../controllers/itemController';
import * as locations from '../controllers/locationController';
import * as roles from '../controllers/roleController';
import * as orders from '../controllers/serviceOrderController';
import * as platform from '../controllers/platformController';
import * as reports from '../controllers/reportController';
import * as storeItems from '../controllers/storeItemController';
import * as team from '../controllers/teamController';
import * as users from '../controllers/userController';
import {
  can,
  isAuth,
  requireCompany,
  requireCompanyAdmin,
  requireFeature,
  requireSuperAdmin,
} from '../middlewares/auth';
import { blueprintUpload, csvUpload, imageUpload, pdfUpload } from '../middlewares/upload';
import { Action, Entity } from '../models/enums';
import { asyncHandler as h } from '../utils/http';

const { CREATE, READ, UPDATE, DELETE } = Action;
const { USERS, CATEGORIES, ITEMS, SERVICE_ORDERS, EVENTS, LOCATIONS, BLUEPRINTS, PAYROLL, CHECKIN, REPORTS } = Entity;

const router = Router();

// ---------- Sesión y perfil ----------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.' },
});

// Pedidos que mandan mails: límite más estricto para que nadie los use para spamear.
const mailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados pedidos. Probá de nuevo en un rato.' },
});

router.post('/auth/login', loginLimiter, h(users.login));
router.post('/auth/forgot', mailLimiter, h(users.forgotPassword));
router.post('/auth/reset', loginLimiter, h(users.resetPassword));
// Entrar en el celular escaneando el QR de una sesión abierta en la PC.
router.post('/auth/link', isAuth, h(users.createLoginLink));
router.post('/auth/link/redeem', loginLimiter, h(users.redeemLoginLink));
router.get('/me', isAuth, h(users.getMyProfile));
router.patch('/me', isAuth, h(users.updateMyProfile));
router.put('/me/password', isAuth, h(users.changeMyPassword));
router.post('/me/avatar', isAuth, imageUpload, h(users.uploadMyAvatar));
router.delete('/me/avatar', isAuth, h(users.deleteMyAvatar));

// Reportar un problema: cualquier usuario con sesión (aunque la suscripción esté vencida).
router.post('/feedback', isAuth, mailLimiter, imageUpload, h(feedback.createFeedback));

// ---------- Usuarios y roles ----------
router.get('/users', can(USERS, READ), h(users.listUsers));
router.get('/users/:id', can(USERS, READ), h(users.getUser));
// Equipo: usuarios, accesos temporales, personal sin acceso y ficha laboral, en un solo lugar.
router.get('/team', can(USERS, READ), h(team.listTeam));
router.post('/team', can(USERS, CREATE), h(team.createPerson));
router.patch('/team/:id', can(USERS, UPDATE), h(team.updatePerson));
router.patch('/team/:id/disabled', can(USERS, UPDATE), h(team.setDisabled));
router.delete('/team/:id', can(USERS, DELETE), requireCompanyAdmin, h(team.deletePerson));

router.get('/roles', can(USERS, READ), h(roles.listRoles));
router.get('/roles/:id', can(USERS, READ), h(roles.getRole));
// Los permisos de cada rol los define solo el administrador de la empresa (evita que alguien se los suba a sí mismo).
router.post('/roles', can(USERS, READ), requireCompanyAdmin, h(roles.createRole));
router.patch('/roles/:id', can(USERS, READ), requireCompanyAdmin, h(roles.updateRole));
router.delete('/roles/:id', can(USERS, READ), requireCompanyAdmin, h(roles.deleteRole));

// ---------- Catálogo ----------
router.get('/categories', can(CATEGORIES, READ), h(categories.listCategories));
router.post('/categories', can(CATEGORIES, CREATE), h(categories.createCategory));
router.patch('/categories/:id', can(CATEGORIES, UPDATE), h(categories.updateCategory));
router.patch('/categories/:id/toggle', can(CATEGORIES, DELETE), h(categories.toggleCategory));

router.get('/items', can(ITEMS, READ), h(items.listItems));
router.get('/items/available', can(ITEMS, READ), h(items.listAvailableItems));
router.get('/items/available/summary', can(ITEMS, READ), h(items.listAvailableSummary));
router.get('/items/available/storable',can(ITEMS, READ), h(items.listAvailableStorableItems));
router.post('/items', can(ITEMS, CREATE), h(items.createItems));
// El token se valida antes de aceptar el archivo.
router.post('/items/import', can(ITEMS, CREATE), csvUpload, h(items.importItemsCsv));
router.patch('/items/:id', can(ITEMS, UPDATE), h(items.updateItem));
router.delete('/items/:id', can(ITEMS, DELETE), h(items.deleteItem));

// Contenido fijo de contenedores
router.post('/containers/contents', can(ITEMS, UPDATE), h(storeItems.assignToContainer));
router.delete('/containers/:parentId/contents', can(ITEMS, UPDATE), h(storeItems.emptyContainer));
router.delete('/containers/:parentId/contents/:childId', can(ITEMS, UPDATE), h(storeItems.removeFromContainer));

// ---------- Eventos y lugares ----------
router.get('/events', can(EVENTS, READ), h(events.listEvents));
router.post('/events', can(EVENTS, CREATE), h(events.createEvent));
router.patch('/events/:id', can(EVENTS, UPDATE), h(events.updateEvent));
router.post('/events/:id/duplicate', can(EVENTS, CREATE), requireFeature('eventTools'), h(events.duplicateEvent));

// ---------- Planos (plan Profesional) ----------
router.get('/blueprints', can(BLUEPRINTS, READ), requireFeature('blueprints'), h(blueprints.listBlueprints));
router.post('/blueprints', can(BLUEPRINTS, CREATE), requireFeature('blueprints'), blueprintUpload, h(blueprints.uploadBlueprint));
router.get('/blueprints/:id/file', can(BLUEPRINTS, READ), requireFeature('blueprints'), h(blueprints.downloadBlueprint));
router.delete('/blueprints/:id', can(BLUEPRINTS, DELETE), requireFeature('blueprints'), h(blueprints.deleteBlueprint));

// ---------- Personal y recibos de sueldo (plan Profesional) ----------
// Gestiona quien tiene el permiso de sueldos; cada empleado ve los suyos.
const payrollSelf = [isAuth, requireCompany, requireFeature('payroll')];
router.get('/payslips', can(PAYROLL, READ), requireFeature('payroll'), h(payroll.listPayslips));
router.post('/payslips', can(PAYROLL, CREATE), requireFeature('payroll'), pdfUpload, h(payroll.uploadPayslip));
router.delete('/payslips/:id', can(PAYROLL, DELETE), requireFeature('payroll'), h(payroll.deletePayslip));
router.post('/payslips/:id/paper', can(PAYROLL, UPDATE), requireFeature('payroll'), h(payroll.markPayslipSignedOnPaper));
router.get('/payslips/:id/file', payrollSelf, h(payroll.downloadPayslip));
router.get('/me/payslips', payrollSelf, h(payroll.listMyPayslips));
router.post('/me/payslips/:id/sign', payrollSelf, h(payroll.signMyPayslip));

router.get('/locations', can(LOCATIONS, READ), h(locations.listLocations));
router.post('/locations', can(LOCATIONS, CREATE), h(locations.createLocation));
router.patch('/locations/:id', can(LOCATIONS, UPDATE), h(locations.updateLocation));

// ---------- Check-in / check-out en el evento y reportes (plan Empresa) ----------
router.get('/checkins', can(CHECKIN, READ), requireFeature('checkin'), h(checkins.listCheckIns));
router.get('/service-orders/:id/checkins', can(CHECKIN, READ), requireFeature('checkin'), h(checkins.listOrderCheckIns));
router.post('/service-orders/:id/checkins', can(CHECKIN, CREATE), requireFeature('checkin'), h(checkins.createCheckIn));
router.get('/reports/overview', can(REPORTS, READ), requireFeature('reports'), h(reports.overview));

// ---------- Órdenes de servicio ----------
router.get('/service-orders', can(SERVICE_ORDERS, READ), h(orders.listServiceOrders));
router.post('/service-orders', can(SERVICE_ORDERS, CREATE), h(orders.createServiceOrder));
router.get('/service-orders/:id', can(SERVICE_ORDERS, READ), h(orders.getServiceOrder));
router.patch('/service-orders/:id', can(SERVICE_ORDERS, UPDATE), h(orders.updateServiceOrder));
router.patch('/service-orders/:id/status', can(SERVICE_ORDERS, UPDATE), h(orders.changeStatus));

router.post('/service-orders/:id/items', can(SERVICE_ORDERS, CREATE), h(orders.addItems));
router.delete('/service-orders/:id/items', can(SERVICE_ORDERS, DELETE), h(orders.removeAllItems));
router.delete('/service-orders/:id/items/:itemId', can(SERVICE_ORDERS, DELETE), h(orders.removeItem));
router.put('/service-orders/:id/items/:itemId/swap', can(SERVICE_ORDERS, UPDATE), h(orders.swapItem));
router.post('/service-orders/:id/transfer', can(SERVICE_ORDERS, UPDATE), requireFeature('eventTools'), h(orders.transferMaterial));

router.post('/service-orders/:id/containers/:containerId/items', can(SERVICE_ORDERS, CREATE), h(orders.addContainerItems));
router.delete('/service-orders/:id/containers/:containerId/items', can(SERVICE_ORDERS, DELETE), h(orders.emptyContainer));
router.delete(
  '/service-orders/:id/containers/:containerId/items/:itemId',
  can(SERVICE_ORDERS, DELETE),
  h(orders.removeContainerItem),
);

// ---------- Empresa y suscripción (administrador de la empresa) ----------
// Sin `requireCompany`: con la suscripción vencida el admin tiene que poder entrar a pagar.
const companyAdmin = [isAuth, requireCompanyAdmin];
router.get('/billing', companyAdmin, h(billing.getBilling));
router.patch('/company', companyAdmin, h(billing.updateCompany));
router.post('/company/logo', companyAdmin, imageUpload, h(billing.uploadLogo));
router.delete('/company/logo', companyAdmin, h(billing.deleteLogo));
router.patch('/company/plan', companyAdmin, h(plans.changeMyPlan));
router.get('/plans', isAuth, plans.listPlans);
router.post('/billing/checkout', companyAdmin, h(billing.checkout));
router.get('/billing/invoices/:id', isAuth, h(billing.getInvoice));
router.post('/billing/mercadopago/webhook', h(billing.mercadoPagoWebhook)); // Público: lo valida la firma.

// ---------- Panel de SRV (superadmin) ----------
const superAdmin = [isAuth, requireSuperAdmin];
router.get('/platform/overview', superAdmin, h(platform.overview));
router.get('/platform/companies', superAdmin, h(platform.listCompanies));
router.post('/platform/companies', superAdmin, h(platform.createCompany));
router.get('/platform/companies/:id', superAdmin, h(platform.getCompany));
router.patch('/platform/companies/:id', superAdmin, h(platform.updateCompany));
router.post('/platform/companies/:id/payments', superAdmin, h(platform.addManualPayment));
router.post('/platform/payments/:paymentId/invoice', superAdmin, h(platform.retryInvoice));
router.get('/platform/feedback', superAdmin, h(feedback.listFeedback));
router.patch('/platform/feedback/:id', superAdmin, h(feedback.updateFeedback));

export default router;
