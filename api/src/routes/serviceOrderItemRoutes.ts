import { Router } from 'express';
import { createServiceOrderItem, createServiceOrderItems, deleteServiceOrderItems, deleteServiceOrderItem, changeItemsByServiceOrderId, changeContainerItemsByServiceOrderId } from '../controllers/serviceOrderItemController';

import { isAuth, checkPermission } from '../middlewares/auth';
import { Entity, Action } from '../models/enums';


const router = Router();

router.post('/', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.CREATE), createServiceOrderItem)
router.post('/bulk', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.CREATE), createServiceOrderItems)
router.put('/:serviceOrderId/:oldItemId/:newItemId', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.UPDATE), changeItemsByServiceOrderId)
router.put('/container/:serviceOrderId/:oldItemId/:newItemId', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.UPDATE), changeContainerItemsByServiceOrderId)
router.delete('/:serviceOrderId/:itemId', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.DELETE), deleteServiceOrderItem)
router.delete('/:serviceOrderId', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.DELETE), deleteServiceOrderItems)

export default router;
