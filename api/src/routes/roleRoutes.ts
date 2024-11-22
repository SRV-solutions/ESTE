import { Router } from 'express';
import { getRole, createRole } from '../controllers/roleController';
import { isAuth, isAdmin } from '../middlewares/auth';

const router = Router();

router.get('/:id', isAuth, getRole);
router.post('/', isAuth, isAdmin, createRole);

export default router;
