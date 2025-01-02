import { Router } from 'express';
import {
  getAllUsers,
  getUser,
  createUser,
  register,
  login,
  getMyOwnUser
} from '../controllers/userController';

import { isAuth, isAdmin } from '../middlewares/auth';

const router = Router();

// Rutas para usuarios
router.get('/profile', isAuth, getMyOwnUser);
router.post('/login', login);
router.get('/', isAuth, getAllUsers);
router.get('/:id', isAuth, getUser);
router.post('/', isAuth, isAdmin, createUser);
router.post('/register', isAuth, isAdmin, register);

export default router;
