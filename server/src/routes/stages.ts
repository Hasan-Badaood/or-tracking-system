import { Router } from 'express';
import { updateVisitStage, getVisitTimeline, getAllStages, createStage, updateStage } from '../controllers/stageController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAllStages);
router.post('/', authenticate, createStage);
router.put('/:id', authenticate, updateStage);

export default router;
