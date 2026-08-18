import { Router } from 'express';
import { KenoController } from './keno.controller';
import { authenticateJwt, optionalAuthenticateJwt } from '../../middleware/auth';

const router = Router();

// Public: View active round and stats
router.get('/live-round', KenoController.getLiveRound);
router.get('/stats', KenoController.getStats);

// Quick play (Instant solo play works for both guests and authenticated players)
router.post('/quick-play', optionalAuthenticateJwt, KenoController.quickPlay);

// My Tickets (Returns user tickets if authenticated, or empty list for guests)
router.get('/my-tickets', optionalAuthenticateJwt, KenoController.getMyTickets);

// Authenticated: Place live bets
router.post('/bet', authenticateJwt, KenoController.placeBet);

export default router;
