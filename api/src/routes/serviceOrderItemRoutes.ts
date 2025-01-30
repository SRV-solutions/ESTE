import { Router } from 'express';
import { createServiceOrderItem, createServiceOrderItems, deleteServiceOrderItems, deleteServiceOrderItem, changeItemsByServiceOrderId } from '../controllers/serviceOrderItemController';

import { isAuth } from '../middlewares/auth';


const router = Router();

router.post('/', isAuth, createServiceOrderItem)
router.post('/bulk', isAuth, createServiceOrderItems)
router.put('/:serviceOrderId/:oldItemId/:newItemId', isAuth, changeItemsByServiceOrderId)
router.delete('/:serviceOrderId/:itemId', isAuth, deleteServiceOrderItem)
router.delete('/:serviceOrderId', isAuth, deleteServiceOrderItems)

export default router;
