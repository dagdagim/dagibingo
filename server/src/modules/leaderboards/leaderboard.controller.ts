import { Request, Response, NextFunction } from 'express';
import { LeaderboardService } from './leaderboard.service';

const leaderboardService = new LeaderboardService();

export class LeaderboardController {
  public static async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = (req.query.category as string) || 'MOST_WINS';
      const period = (req.query.period as string) || 'ALL_TIME';
      const data = await leaderboardService.getLeaderboard(category, period);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
