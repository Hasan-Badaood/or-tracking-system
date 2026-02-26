import { Router } from 'express';
import { getRooms, getRoomById, updateRoomStatus, startCleaning, completeCleaning } from '../controllers/roomController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getRooms);
router.get('/:id', authenticate, getRoomById);
router.put('/:id/status', authenticate, updateRoomStatus);
router.post('/:id/cleaning/start', authenticate, startCleaning);
router.post('/:id/cleaning/complete', authenticate, completeCleaning);

export default router;
