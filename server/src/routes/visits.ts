import { Router } from 'express';
import { getVisits, createVisit, updateStage } from '../controllers/visitController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getVisits);
router.post('/', authenticate, createVisit);
router.put('/:id/stage', authenticate, updateStage);

export default router;
