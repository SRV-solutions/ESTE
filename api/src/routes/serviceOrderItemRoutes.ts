import { Router } from 'express';
import { createServiceOrderItem, createServiceOrderItems } from '../controllers/serviceOrderItemController';

const router = Router();

router.post('/', createServiceOrderItem)
router.post('/bulk', createServiceOrderItems)

export default router;
