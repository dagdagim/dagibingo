import { Router } from 'express';
import {
  startTowersGame,
  stepTowersGame,
  cashoutTowersGame,
  getActiveTowersGame,
  getMyTowersHistory,
} from './towers.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/active', authenticateJwt, getActiveTowersGame);
router.get('/my-history', authenticateJwt, getMyTowersHistory);

router.post('/start', authenticateJwt, startTowersGame);
router.post('/step', authenticateJwt, stepTowersGame);
router.post('/cashout', authenticateJwt, cashoutTowersGame);

export default router;
