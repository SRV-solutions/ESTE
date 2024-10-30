import { Router } from 'express';
import { createServiceOrderItem, createServiceOrderItems, deleteServiceOrderItems } from '../controllers/serviceOrderItemController';

const router = Router();

router.post('/', createServiceOrderItem)
router.post('/bulk', createServiceOrderItems)
router.delete('/:serviceOrderId', deleteServiceOrderItems)

export default router;
