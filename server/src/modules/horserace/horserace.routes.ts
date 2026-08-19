import { Router } from 'express';
import {
  placeHorseBet,
  getCurrentRound,
  getMyHorseHistory,
  getHorseRaceStats,
} from './horserace.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Public / Guest accessible endpoints
router.get('/current-round', getCurrentRound);
router.get('/stats', getHorseRaceStats);

// Protected endpoints
router.post('/bet', authenticateJwt, placeHorseBet);
router.get('/my-history', authenticateJwt, getMyHorseHistory);

export default router;
