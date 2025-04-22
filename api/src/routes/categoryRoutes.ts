import { Router } from 'express';
import { getCategories, createCategory, deleteCategory, updateCategory } from '../controllers/categoryController';
import { isAuth, checkPermission } from '../middlewares/auth';
import { Action, Entity } from '../models/enums';

const router = Router();

router.get('/', isAuth, checkPermission(Entity.CATEGORIES, Action.READ), getCategories);
router.post('/', isAuth, checkPermission(Entity.CATEGORIES, Action.CREATE), createCategory);
router.delete('/:id', isAuth, checkPermission(Entity.CATEGORIES, Action.DELETE), deleteCategory);
router.patch('/:id', isAuth, checkPermission(Entity.CATEGORIES, Action.UPDATE), updateCategory);

export default router;
