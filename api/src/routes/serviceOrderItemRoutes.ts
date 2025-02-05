import { Router } from 'express';
import { createServiceOrderItem, createServiceOrderItems, deleteServiceOrderItems, deleteServiceOrderItem, changeItemsByServiceOrderId, changeContainerItemsByServiceOrderId } from '../controllers/serviceOrderItemController';

import { isAuth } from '../middlewares/auth';


const router = Router();

router.post('/', isAuth, createServiceOrderItem)
router.post('/bulk', isAuth, createServiceOrderItems)
router.put('/:serviceOrderId/:oldItemId/:newItemId', isAuth, changeItemsByServiceOrderId)
router.put('/container/:serviceOrderId/:oldItemId/:newItemId', isAuth, changeContainerItemsByServiceOrderId)
router.delete('/:serviceOrderId/:itemId', isAuth, deleteServiceOrderItem)
router.delete('/:serviceOrderId', isAuth, deleteServiceOrderItems)

export default router;
