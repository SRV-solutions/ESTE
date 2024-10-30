import { Router } from 'express';
import { createServiceOrderStoreItem, createServiceOrderStoreItems } from '../controllers/serviceOrderStoreItemController';

const router = Router();

router.post('/', createServiceOrderStoreItem)
router.post('/bulk', createServiceOrderStoreItems)

export default router;
