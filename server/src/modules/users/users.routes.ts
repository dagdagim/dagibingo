import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/me', UsersController.getMe);
router.patch('/me', UsersController.updateMe);
router.put('/responsible-gaming', UsersController.updateResponsibleGaming);
router.post('/kyc', UsersController.submitKyc);

export default router;
