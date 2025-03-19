import { Router } from 'express';
import {
  getAllUsers,
  getUser,
  createUser,
  register,
  login,
  getMyOwnUser,
  updateUser,
  changePassword
} from '../controllers/userController';

import { isAuth, isAdmin } from '../middlewares/auth';

const router = Router();

// Rutas para usuarios
router.get('/profile', isAuth, getMyOwnUser);
router.post('/login', login);
router.get('/', isAuth, getAllUsers);
router.get('/:id', isAuth, getUser);
router.post('/', isAuth, isAdmin, createUser);
router.post('/register',isAuth, register);
router.patch('/update/:id', isAuth, updateUser)
router.put('/:id/change-password',isAuth, changePassword);


export default router;
