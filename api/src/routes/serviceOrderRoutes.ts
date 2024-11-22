import { Router } from 'express';
import { createServiceOrder, getServiceOrderById } from '../controllers/serviceOrderController';
import { isAuth } from '../middlewares/auth';

const router = Router();

router.post('/', isAuth, createServiceOrder)
router.get('/:id', isAuth, getServiceOrderById)

export default router;
