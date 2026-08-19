import { Router } from 'express';
import {
  placeBet,
  cancelBet,
  cashout,
  getCurrentRound,
  getMyHistory,
  getStats,
} from './aviator.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Public routes
router.get('/current-round', getCurrentRound);
router.get('/stats', getStats);

// Protected routes
router.post('/bet', authenticateJwt, placeBet);
router.post('/cancel-bet', authenticateJwt, cancelBet);
router.post('/cashout', authenticateJwt, cashout);
router.get('/my-history', authenticateJwt, getMyHistory);

export default router;
