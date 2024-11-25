import { Router } from 'express';
import { createServiceOrder, getServiceOrderById, getServiceOrders } from '../controllers/serviceOrderController';
import { isAuth } from '../middlewares/auth';

const router = Router();

router.post('/', isAuth, createServiceOrder)
router.get('/', isAuth, getServiceOrders)
router.get('/:id', isAuth, getServiceOrderById)

export default router;
