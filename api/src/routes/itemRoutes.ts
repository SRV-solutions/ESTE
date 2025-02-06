import { Router } from 'express';
import { getItems, createItem, deleteItem, getAvalibleItemsByCategory, getAvalibleItems, getAvailableStoreItems } from '../controllers/itemController';

import { isAdmin, isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getItems);
router.get('/avalible', isAuth, getAvalibleItems);
router.get('/avalible/store', isAuth, getAvailableStoreItems);
router.get('/avalible/category', isAuth, getAvalibleItemsByCategory);
router.post('/', isAuth, createItem);
router.delete('/:id', isAuth, deleteItem);

export default router;
