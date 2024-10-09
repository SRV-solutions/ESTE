import { Router } from 'express';
import { createServiceOrderItem } from '../controllers/serviceOrderItemController';

const router = Router();

router.post('/', createServiceOrderItem)

export default router;
