import { Router } from 'express';
import { createServiceOrder, getServiceOrderById, getServiceOrders, updateStatusServiceOrderById } from '../controllers/serviceOrderController';
import { isAuth, checkPermission } from '../middlewares/auth';
import { Entity, Action } from '../models/enums';

const router = Router();

router.post('/', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.CREATE), createServiceOrder)
router.get('/', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.READ), getServiceOrders)
router.get('/:id', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.READ), getServiceOrderById)
router.patch('/:id', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.UPDATE), updateStatusServiceOrderById)

export default router;
