import { Router } from 'express';
import { login, refresh, logout, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema } from '../validators/auth.validator';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
