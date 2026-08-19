import { Router } from 'express';
import {
  startChickenRoadGame,
  stepChickenRoadGame,
  cashoutChickenRoadGame,
  getActiveChickenRoadGame,
  getMyChickenRoadHistory,
} from './chickenroad.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/active', authenticateJwt, getActiveChickenRoadGame);
router.get('/my-history', authenticateJwt, getMyChickenRoadHistory);
router.post('/start', authenticateJwt, startChickenRoadGame);
router.post('/step', authenticateJwt, stepChickenRoadGame);
router.post('/cashout', authenticateJwt, cashoutChickenRoadGame);

export default router;
