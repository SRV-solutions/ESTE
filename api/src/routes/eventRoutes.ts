import { Router } from 'express';
import { getEvents } from '../controllers/eventController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getEvents);

export default router;
