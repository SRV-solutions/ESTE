import { Router } from 'express';
import { getLocations, createLocation, updateLocation } from '../controllers/locationController';

import { isAuth } from '../middlewares/auth';

const router = Router();

router.get('/', isAuth, getLocations);
router.post('/', isAuth, createLocation);
router.put('/events/:id', updateLocation); // Ruta para actualizar

export default router;
