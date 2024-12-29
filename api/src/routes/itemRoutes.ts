import { Router } from 'express';
import { getItems, createItem } from '../controllers/itemController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getItems);
router.post('/', createItem);

export default router;
