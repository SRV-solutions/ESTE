import { Router } from 'express';
import { getCategories, createCategory, deleteCategory, updateCategory } from '../controllers/categoryController';

import { isAdmin, isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getCategories);
router.post('/', isAuth, isAdmin, createCategory);
router.delete('/:id', isAuth, isAdmin, deleteCategory);
router.patch('/:id', isAuth, isAdmin, updateCategory);

export default router;
