import { Router } from 'express';
import { getDailySummary, getStageDuration } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/daily-summary', authenticate, getDailySummary);
router.get('/stage-duration', authenticate, getStageDuration);

export default router;
