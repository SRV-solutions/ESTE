import { Router } from 'express';
import { getCategories } from '../controllers/categoryController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getCategories);

export default router;
