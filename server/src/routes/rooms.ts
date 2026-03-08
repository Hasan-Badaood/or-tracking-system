import { Router } from 'express';
import { getRooms, getRoomById, updateRoomStatus, startCleaning, completeCleaning, createRoom, updateRoom, deleteRoom } from '../controllers/roomController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getRooms);
router.post('/', authenticate, createRoom);
router.get('/:id', authenticate, getRoomById);
router.put('/:id/status', authenticate, updateRoomStatus);
router.put('/:id', authenticate, updateRoom);
router.delete('/:id', authenticate, deleteRoom);
router.post('/:id/cleaning/start', authenticate, startCleaning);
router.post('/:id/cleaning/complete', authenticate, completeCleaning);

export default router;
