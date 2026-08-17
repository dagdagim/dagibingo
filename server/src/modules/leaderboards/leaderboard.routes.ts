import { Router } from 'express';
import { LeaderboardController } from './leaderboard.controller';

const router = Router();

router.get('/', LeaderboardController.getLeaderboard);

export default router;
