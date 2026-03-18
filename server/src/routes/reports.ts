import { Router, Request, Response } from 'express';
import { getDailySummary, getStageDuration, getDateRange, getAuditLog } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';
import { notificationConfig } from '../services/notificationService';

const router = Router();

router.get('/daily-summary', authenticate, getDailySummary);
router.get('/stage-duration', authenticate, getStageDuration);
router.get('/date-range', authenticate, getDateRange);
router.get('/audit-log', authenticate, getAuditLog);
router.get('/notification-config', authenticate, (_req: Request, res: Response) => {
  res.json({ success: true, ...notificationConfig });
});

export default router;
