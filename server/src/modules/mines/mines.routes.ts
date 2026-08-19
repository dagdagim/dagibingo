import { Router } from 'express';
import {
  startMinesGame,
  revealMinesTile,
  cashoutMinesGame,
  getActiveMinesGame,
  getMinesHistory,
  getMinesStats,
} from './mines.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

// Public / Guest accessible stats
router.get('/stats', getMinesStats);

// Protected endpoints
router.use(authenticateJwt);

router.post('/start', startMinesGame);
router.post('/reveal', revealMinesTile);
router.post('/cashout', cashoutMinesGame);
router.get('/active', getActiveMinesGame);
router.get('/history', getMinesHistory);

export default router;
