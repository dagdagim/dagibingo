import { Router } from 'express';
import { KenoController } from './keno.controller';
import { authenticateJwt, optionalAuthenticateJwt } from '../../middleware/auth';

const router = Router();

// Public: View active round and stats
router.get('/live-round', KenoController.getLiveRound);
router.get('/stats', KenoController.getStats);

// Quick play (Instant solo play works for both guests and authenticated players)
router.post('/quick-play', optionalAuthenticateJwt, KenoController.quickPlay);

// Authenticated: Place bets and view personal tickets
router.post('/bet', authenticateJwt, KenoController.placeBet);
router.post('/multi-bet', authenticateJwt, KenoController.placeMultiBets);
router.get('/my-tickets', authenticateJwt, KenoController.getMyTickets);

export default router;
