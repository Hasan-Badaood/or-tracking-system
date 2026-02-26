import { Router } from 'express';
import { updateVisitStage, getVisitTimeline, getAllStages } from '../controllers/stageController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAllStages);

export default router;
