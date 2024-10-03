import { Router } from 'express';
import { getUser, createUser, getAllUsers } from '../controllers/userController';

const router = Router();

router.get('/', getAllUsers);
router.get('/:id', getUser);
router.post('/', createUser)

export default router;
