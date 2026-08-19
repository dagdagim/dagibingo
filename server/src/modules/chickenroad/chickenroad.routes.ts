import { Router } from 'express';
import {
  startChickenRoadGame,
  stepChickenRoad,
  cashoutChickenRoad,
  getActiveChickenRoadGame,
  getMyChickenRoadHistory,
} from './chickenroad.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateJwt);

router.post('/start', startChickenRoadGame);
router.post('/step', stepChickenRoad);
router.post('/cashout', cashoutChickenRoad);
router.get('/active', getActiveChickenRoadGame);
router.get('/my-history', getMyChickenRoadHistory);

export default router;
