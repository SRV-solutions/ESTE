import { Router } from 'express';
import { createServiceOrderStoreItem, createServiceOrderStoreItems, deleteServiceOrderStoreItem } from '../controllers/serviceOrderStoreItemController';
import { isAuth, checkPermission } from '../middlewares/auth';
import { Entity, Action } from '../models/enums';

const router = Router();

router.delete('/:serviceOrderId/:itemIdParent/:itemIdChild', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.DELETE), deleteServiceOrderStoreItem)
router.post('/', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.CREATE), createServiceOrderStoreItem)
router.post('/bulk', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.CREATE), createServiceOrderStoreItems)

export default router;
