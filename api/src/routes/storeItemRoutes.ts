import { Router } from 'express';
import { createStoreItems, deleteStoreItem } from '../controllers/storeItemController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.post('/', isAuth, createStoreItems);
router.delete('/:parentId/:childId', isAuth, deleteStoreItem);

export default router;
