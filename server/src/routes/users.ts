import { Router } from 'express';
import { getUsers, createUser, updateUser, changePassword } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getUsers);
router.post('/', authenticate, createUser);
router.put('/:id', authenticate, updateUser);
router.put('/:id/password', authenticate, changePassword);

export default router;
