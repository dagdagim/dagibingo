import { Router } from 'express';
import { KenoController } from './keno.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Public: View active round and stats
router.get('/live-round', KenoController.getLiveRound);
router.get('/stats', KenoController.getStats);

// Authenticated: Place bets and view personal tickets
router.post('/bet', authenticateJwt, KenoController.placeBet);
router.post('/quick-play', authenticateJwt, KenoController.quickPlay);
router.get('/my-tickets', authenticateJwt, KenoController.getMyTickets);

export default router;
