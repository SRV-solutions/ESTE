import { Router } from 'express';
import { createStoreItems, deleteStoreItem } from '../controllers/storeItemController';

import { isAdmin, isAuth } from '../middlewares/auth';

const router = Router();

router.post('/', isAuth, isAdmin, createStoreItems);
router.delete('/:parentId/:childId', isAuth, isAdmin, deleteStoreItem);

export default router;
