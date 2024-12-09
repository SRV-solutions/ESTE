import { Router } from 'express';
import { createServiceOrder, getServiceOrderById, getServiceOrders, updateStatusServiceOrderById } from '../controllers/serviceOrderController';
import { isAuth } from '../middlewares/auth';

const router = Router();

router.post('/', isAuth, createServiceOrder)
router.get('/', isAuth, getServiceOrders)
router.get('/:id', isAuth, getServiceOrderById)
router.patch('/:id', isAuth, updateStatusServiceOrderById)

export default router;
