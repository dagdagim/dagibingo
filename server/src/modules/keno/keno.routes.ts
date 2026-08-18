import { Router } from 'express';
import { KenoController } from './keno.controller';
import { authenticateJwt } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { kenoPlaySchema } from '../../shared';

const router = Router();

// Publicly visible paytable & stats
router.get('/paytable', KenoController.getPaytable);
router.get('/stats', KenoController.getStats);

// Authenticated player actions
router.post('/play', authenticateJwt, validateBody(kenoPlaySchema), KenoController.play);
router.get('/history', authenticateJwt, KenoController.getHistory);

export default router;
