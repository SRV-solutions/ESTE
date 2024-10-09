import { Router } from 'express';
import { createServiceOrder, getServiceOrderById } from '../controllers/serviceOrderController';

const router = Router();

router.post('/', createServiceOrder)
router.get('/:id', getServiceOrderById)

export default router;
