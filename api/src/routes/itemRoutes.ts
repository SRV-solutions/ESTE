import { Router } from 'express';
import { getItems, createItem, deleteItem, getAvalibleItemsByCategory, getAvalibleItems } from '../controllers/itemController';

import { isAdmin, isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getItems);
router.get('/avalible', isAuth, getAvalibleItems);
router.get('/avalible/category', isAuth, getAvalibleItemsByCategory);
router.post('/', isAuth, isAdmin, createItem);
router.delete('/:id', isAuth, isAdmin, deleteItem);

export default router;
