import { Router } from 'express';
import { NotificationsController } from './notifications.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', NotificationsController.getMyNotifications);
router.patch('/:id/read', NotificationsController.markRead);
router.post('/read-all', NotificationsController.markAllRead);

export default router;
