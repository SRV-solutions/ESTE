import { Router } from 'express';
import { getItems } from '../controllers/itemController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getItems);

export default router;
