import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticateJwt, requireRole } from '../../middleware/auth';

const router = Router();

// Protect all admin routes with authentication and ADMIN/MODERATOR role
router.use(authenticateJwt);
router.use(requireRole('ADMIN', 'MODERATOR'));

router.get('/metrics', AdminController.getMetrics);
router.get('/users', AdminController.listUsers);
router.patch('/users/:id/status', AdminController.toggleUserStatus);
router.get('/games', AdminController.listGames);
router.post('/games/:id/start', AdminController.forceStartGame);
router.post('/games/:id/cancel', AdminController.cancelGame);
router.get('/kyc', AdminController.listKyc);
router.patch('/kyc/:id', AdminController.reviewKyc);
router.get('/audit-logs', AdminController.listAuditLogs);
router.get('/bet-records', AdminController.listBetRecords);
router.get('/fraud-alerts', AdminController.listFraudAlerts);

export default router;
