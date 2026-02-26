import { Router } from 'express';
import { getVisits, createVisit, getVisitById, updateVisit, deleteVisit } from '../controllers/visitController';
import { updateVisitStage, getVisitTimeline } from '../controllers/stageController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Visit management endpoints
router.get('/', authenticate, getVisits);
router.post('/', authenticate, createVisit);
router.get('/:id', authenticate, getVisitById);
router.put('/:id', authenticate, updateVisit);
router.delete('/:id', authenticate, deleteVisit);

// Stage management endpoints (under visits)
router.put('/:id/stage', authenticate, updateVisitStage);
router.get('/:id/timeline', authenticate, getVisitTimeline);

export default router;
