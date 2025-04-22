import { Router } from 'express';
import { createStoreItems, deleteStoreItem } from '../controllers/storeItemController';
import { Entity, Action } from '../models/enums';
import { isAuth, checkPermission } from '../middlewares/auth';

const router = Router();

router.post('/', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.CREATE), createStoreItems);
router.delete('/:parentId/:childId', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.DELETE), deleteStoreItem);

export default router;
