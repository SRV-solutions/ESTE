import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import upload from '../config/multer';
import * as billing from '../controllers/billingController';
import * as categories from '../controllers/categoryController';
import * as events from '../controllers/eventController';
import * as items from '../controllers/itemController';
import * as locations from '../controllers/locationController';
import * as roles from '../controllers/roleController';
import * as orders from '../controllers/serviceOrderController';
import * as platform from '../controllers/platformController';
import * as storeItems from '../controllers/storeItemController';
import * as users from '../controllers/userController';
import { can, isAuth, requireCompanyAdmin, requireSuperAdmin } from '../middlewares/auth';
import { Action, Entity } from '../models/enums';
import { asyncHandler as h } from '../utils/http';

const { CREATE, READ, UPDATE, DELETE } = Action;
const { USERS, CATEGORIES, ITEMS, SERVICE_ORDERS } = Entity;

const router = Router();

// ---------- Sesión y perfil ----------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.' },
});

router.post('/auth/login', loginLimiter, h(users.login));
router.get('/me', isAuth, h(users.getMyProfile));
router.patch('/me', isAuth, h(users.updateMyProfile));
router.put('/me/password', isAuth, h(users.changeMyPassword));

// ---------- Usuarios y roles ----------
router.get('/users', can(USERS, READ), h(users.listUsers));
router.get('/users/:id', can(USERS, READ), h(users.getUser));
router.post('/users', can(USERS, CREATE), h(users.createUser));
router.patch('/users/:id', can(USERS, UPDATE), h(users.updateUser));

router.get('/roles', can(USERS, READ), h(roles.listRoles));
router.get('/roles/:id', can(USERS, READ), h(roles.getRole));
router.post('/roles', can(USERS, CREATE), h(roles.createRole));

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
router.post('/items/import', can(ITEMS, CREATE), upload.single('file'), h(items.importItemsCsv));
router.patch('/items/:id', can(ITEMS, UPDATE), h(items.updateItem));
router.delete('/items/:id', can(ITEMS, DELETE), h(items.deleteItem));

// Contenido fijo de contenedores
router.post('/containers/contents', can(ITEMS, UPDATE), h(storeItems.assignToContainer));
router.delete('/containers/:parentId/contents', can(ITEMS, UPDATE), h(storeItems.emptyContainer));
router.delete('/containers/:parentId/contents/:childId', can(ITEMS, UPDATE), h(storeItems.removeFromContainer));

// ---------- Eventos y lugares ----------
router.get('/events', can(SERVICE_ORDERS, READ), h(events.listEvents));
router.post('/events', can(SERVICE_ORDERS, CREATE), h(events.createEvent));
router.patch('/events/:id', can(SERVICE_ORDERS, UPDATE), h(events.updateEvent));

router.get('/locations', can(SERVICE_ORDERS, READ), h(locations.listLocations));
router.post('/locations', can(SERVICE_ORDERS, CREATE), h(locations.createLocation));
router.patch('/locations/:id', can(SERVICE_ORDERS, UPDATE), h(locations.updateLocation));

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

export default router;
