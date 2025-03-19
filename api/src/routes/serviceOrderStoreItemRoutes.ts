import { Router } from 'express';
import { createServiceOrderStoreItem, createServiceOrderStoreItems, deleteServiceOrderStoreItem } from '../controllers/serviceOrderStoreItemController';
import { isAuth } from '../middlewares/auth';

const router = Router();

router.delete('/:serviceOrderId/:itemIdParent/:itemIdChild', isAuth, deleteServiceOrderStoreItem)
router.post('/', isAuth, createServiceOrderStoreItem)
router.post('/bulk', isAuth, createServiceOrderStoreItems)

export default router;
