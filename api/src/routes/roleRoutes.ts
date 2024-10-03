import { Router } from 'express';
import { getRole, createRole } from '../controllers/roleController';

const router = Router();

router.get('/:id', getRole);
router.post('/', createRole);

export default router;
