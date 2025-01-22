import { Router } from 'express';
import { getCategories, createCategory, deleteCategory } from '../controllers/categoryController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getCategories);
router.post('/', isAuth, createCategory);
router.delete('/:id', isAuth, deleteCategory);

export default router;
