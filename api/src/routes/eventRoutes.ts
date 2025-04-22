import { Router } from 'express';
import { getEvents, createEvent, updateEvent } from '../controllers/eventController';
import { isAuth, checkPermission } from '../middlewares/auth';
import { Action, Entity  } from '../models/enums';


const router = Router();

router.get('/', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.READ), getEvents);
router.post('/', isAuth,  checkPermission(Entity.SERVICE_ORDERS, Action.CREATE),createEvent);
router.put('/events/:id', isAuth,  checkPermission(Entity.SERVICE_ORDERS, Action.UPDATE),updateEvent); // Ruta para actualizar

export default router;
