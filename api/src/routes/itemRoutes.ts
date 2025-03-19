import { Router } from 'express';
import { getItems, createItem, deleteItem, getAvalibleItemsByCategory, getAvalibleItems, getAvailableStoreItems, uploadCSV } from '../controllers/itemController';
import upload from '../config/multer';
import { isAdmin, isAuth } from '../middlewares/auth';

const router = Router();

router.get('/',  getItems);
// router.post('/upload', upload.single('file'), uploadItems);

router.post('/upload-csv', upload.single('file'), uploadCSV);
router.get('/avalible', isAuth, getAvalibleItems);
router.get('/avalible/store', isAuth, getAvailableStoreItems);
router.get('/avalible/category', isAuth, getAvalibleItemsByCategory);
router.post('/', isAuth, isAdmin, createItem);
router.delete('/:id', isAuth, isAdmin, deleteItem);

export default router;
