import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { getProfile } from '../controllers/profileController';
import { requireAuth } from '../../../security/middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getProfile);

export default router;
