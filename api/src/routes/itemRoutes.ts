import { Router } from 'express';
import { getItems, createItem, deleteItem } from '../controllers/itemController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getItems);
router.post('/', createItem);
router.delete('/:id', deleteItem);

export default router;
