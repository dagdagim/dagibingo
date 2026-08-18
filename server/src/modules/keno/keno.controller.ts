import { Request, Response, NextFunction } from 'express';
import { KenoService } from './keno.service';
import { KENO_PAYTABLE } from '../../shared';

const kenoService = new KenoService();

export class KenoController {
  public static async play(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { spots, wager } = req.body;
      const result = await kenoService.playKeno(userId, { spots, wager });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const history = await kenoService.getUserHistory(userId, limit);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  public static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await kenoService.getKenoStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  public static getPaytable(req: Request, res: Response): void {
    res.status(200).json({ success: true, data: KENO_PAYTABLE });
  }
}
