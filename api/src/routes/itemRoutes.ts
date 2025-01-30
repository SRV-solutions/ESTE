import { Router } from 'express';
import { getItems, createItem, deleteItem, getAvalibleItemsByCategory, getAvalibleItems } from '../controllers/itemController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getItems);
router.get('/avalible', getAvalibleItems);
router.get('/avalible/category', getAvalibleItemsByCategory);
router.post('/',isAuth, createItem);
router.delete('/:id', deleteItem);

export default router;
