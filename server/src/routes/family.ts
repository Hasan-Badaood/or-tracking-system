import { Router } from 'express';
import { requestOTP, verifyOTP, getVisitStatus } from '../controllers/familyController';
import { otpRequestRateLimit, otpVerifyRateLimit } from '../middleware/rateLimit';

const router = Router();

router.post('/request-otp', otpRequestRateLimit, requestOTP);
router.post('/verify-otp', otpVerifyRateLimit, verifyOTP);
router.get('/visit/:token', getVisitStatus);

export default router;
