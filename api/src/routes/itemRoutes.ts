import { Router } from 'express';
import { getItems, createItem, deleteItem, getAvalibleItemsByCategory, getAvalibleItems, getAvailableStoreItems, uploadCSV, updateItem } from '../controllers/itemController';
import upload from '../config/multer';
import { isAuth, checkPermission } from '../middlewares/auth';
import { Entity, Action } from '../models/enums';

const router = Router();

router.get('/', isAuth, checkPermission(Entity.ITEMS, Action.READ), getItems);
router.post('/upload-csv', upload.single('file'), isAuth, checkPermission(Entity.ITEMS, Action.CREATE), uploadCSV);
router.get('/avalible', isAuth, checkPermission(Entity.ITEMS, Action.READ), getAvalibleItems);
router.get('/avalible/store', isAuth, checkPermission(Entity.ITEMS, Action.READ), getAvailableStoreItems);
router.get('/avalible/category', isAuth, checkPermission(Entity.ITEMS, Action.READ), getAvalibleItemsByCategory);
router.post('/', isAuth, checkPermission(Entity.ITEMS, Action.CREATE), createItem);
router.delete('/:id', isAuth, checkPermission(Entity.ITEMS, Action.DELETE), deleteItem);
router.patch('/:id', isAuth, checkPermission(Entity.ITEMS, Action.UPDATE), updateItem);

export default router;
