import { Router } from 'express';
import { getEvents, createEvent, updateEvent } from '../controllers/eventController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getEvents);
router.post('/', isAuth, createEvent);
router.put('/events/:id', updateEvent); // Ruta para actualizar

export default router;
