import { Router } from 'express';
import { getItems, createItem, deleteItem, getAvalibleItemsByCategory, getAvalibleItems, getAvailableStoreItems, uploadCSV, updateItem } from '../controllers/itemController';
import upload from '../config/multer';
import { isAdmin, isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', getItems);
// router.post('/upload', upload.single('file'), uploadItems);

router.post('/upload-csv', upload.single('file'), isAuth, uploadCSV);
router.get('/avalible', isAuth, getAvalibleItems);
router.get('/avalible/store', isAuth, getAvailableStoreItems);
router.get('/avalible/category', isAuth, getAvalibleItemsByCategory);
router.post('/', isAuth, isAdmin, createItem);
router.delete('/:id', isAuth, isAdmin, deleteItem);
router.patch('/:id', isAuth, isAdmin, updateItem);

export default router;
