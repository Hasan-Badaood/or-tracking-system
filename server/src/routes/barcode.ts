import { Router } from 'express';
import { generateBarcode, scanBarcode } from '../controllers/barcodeController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/generate', authenticate, generateBarcode);
router.post('/scan', authenticate, scanBarcode);

export default router;
