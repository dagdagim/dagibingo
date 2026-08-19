import { Router } from 'express';
import {
  startChickenGame,
  stepChickenGame,
  cashoutChickenGame,
  getActiveChickenGame,
  getMyChickenHistory,
} from './chicken.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/active', authenticateJwt, getActiveChickenGame);
router.get('/my-history', authenticateJwt, getMyChickenHistory);
router.post('/start', authenticateJwt, startChickenGame);
router.post('/step', authenticateJwt, stepChickenGame);
router.post('/cashout', authenticateJwt, cashoutChickenGame);

export default router;
