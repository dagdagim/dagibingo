import { Router } from 'express';
import { PlinkoController } from './plinko.controller';
import { authenticateJwt, optionalAuthenticateJwt } from '../../middleware/auth';

const router = Router();

// Public: View paytables & stats
router.get('/paytables', PlinkoController.getPaytables);
router.get('/stats', PlinkoController.getStats);

// Drops (Supports both authenticated real bets & guest sandbox drops)
router.post('/drop', optionalAuthenticateJwt, PlinkoController.dropBall);
router.post('/batch-drop', optionalAuthenticateJwt, PlinkoController.dropBatch);

// Authenticated personal history
router.get('/my-history', authenticateJwt, PlinkoController.getMyHistory);

export default router;
