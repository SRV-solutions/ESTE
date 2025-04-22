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
import { Entity, Action } from '../models/enums';
import { isAuth, checkPermission } from '../middlewares/auth';

const router = Router();

// Rutas para usuarios
router.get('/profile', isAuth, checkPermission(Entity.USERS, Action.READ), getMyOwnUser);
router.post('/login', login);
router.get('/', isAuth, checkPermission(Entity.USERS, Action.READ), getAllUsers);
router.get('/:id', isAuth, checkPermission(Entity.USERS, Action.READ), getUser);
router.post('/', isAuth, checkPermission(Entity.USERS, Action.CREATE), createUser);
router.post('/register', isAuth, checkPermission(Entity.USERS, Action.CREATE), register);
router.patch('/update/:id', isAuth, checkPermission(Entity.USERS, Action.UPDATE), updateUser)
router.put('/:id/change-password', isAuth, checkPermission(Entity.USERS, Action.UPDATE), changePassword);


export default router;
