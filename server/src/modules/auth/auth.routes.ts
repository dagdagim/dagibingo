import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { authenticateJwt } from '../../middleware/auth';
import { loginSchema, registerSchema } from '@bingo/shared';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticateJwt, AuthController.logout);

export default router;
