import { Router } from 'express';
import { getUsers, createUser, updateUser, changePassword, getUserAuditLog, sendUserCredentials } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getUsers);
router.get('/audit', authenticate, getUserAuditLog);
router.post('/', authenticate, createUser);
router.put('/:id', authenticate, updateUser);
router.put('/:id/password', authenticate, changePassword);
router.post('/:id/send-credentials', authenticate, sendUserCredentials);

export default router;
