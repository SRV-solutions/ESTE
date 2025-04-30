import { Router } from 'express';
import { getLocations, createLocation, updateLocation } from '../controllers/locationController';

import { isAuth, checkPermission } from '../middlewares/auth';
import { Entity, Action } from '../models/enums';

const router = Router();

router.get('/', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.READ), getLocations);
router.post('/', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.CREATE), createLocation);
router.patch('/:id', isAuth, checkPermission(Entity.SERVICE_ORDERS, Action.UPDATE), updateLocation); // Ruta para actualizar

export default router;
