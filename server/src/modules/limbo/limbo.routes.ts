import { Router } from 'express';
import {
  placeLimboBet,
  getMyLimboHistory,
  getLimboStats,
} from './limbo.controller';
import { authenticateJwt } from '../../middleware/auth';

const router = Router();

router.get('/stats', getLimboStats);
router.get('/my-history', authenticateJwt, getMyLimboHistory);
router.post('/bet', authenticateJwt, placeLimboBet);

export default router;
