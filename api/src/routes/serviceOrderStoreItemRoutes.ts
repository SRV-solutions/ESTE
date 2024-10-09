import { Router } from 'express';
import { createServiceOrderStoreItem } from '../controllers/serviceOrderStoreItemController';

const router = Router();

router.post('/', createServiceOrderStoreItem)

export default router;
