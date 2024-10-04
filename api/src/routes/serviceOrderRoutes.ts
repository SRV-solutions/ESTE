import { Router } from 'express';
import { createServiceOrder } from '../controllers/serviceOrderController';

const router = Router();

router.post('/', createServiceOrder)

export default router;
