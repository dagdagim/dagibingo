import { Router } from 'express';
import {
  placeGreyhoundBet,
  getCurrentRound,
  getMyGreyhoundHistory,
  getGreyhoundStats,
} from './greyhound.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Public / Guest accessible endpoints
router.get('/current-round', getCurrentRound);
router.get('/stats', getGreyhoundStats);

// Protected endpoints
router.post('/bet', authenticateJwt, placeGreyhoundBet);
router.get('/my-history', authenticateJwt, getMyGreyhoundHistory);

export default router;
