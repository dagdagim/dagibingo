import { Request, Response } from 'express';
import { PlinkoEngine } from '../../game-engine/PlinkoEngine';
import { PLINKO_PAYTABLES } from '../../shared';

export class PlinkoController {
  /**
   * GET /api/plinko/paytables
   */
  public static async getPaytables(_req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: PLINKO_PAYTABLES,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  /**
   * POST /api/plinko/drop
   */
  public static async dropBall(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
      const { betAmount, rows, risk } = req.body;

      const result = await PlinkoEngine.getInstance().dropBall({
        userId,
        betAmount: Number(betAmount),
        rows: Number(rows) as any,
        risk,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: (err as Error).message });
    }
  }

  /**
   * POST /api/plinko/batch-drop
   */
  public static async dropBatch(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
      const { betAmount, count, rows, risk } = req.body;

      const result = await PlinkoEngine.getInstance().dropBatch({
        userId,
        betAmount: Number(betAmount),
        count: Number(count) || 5,
        rows: Number(rows) as any,
        risk,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: (err as Error).message });
    }
  }

  /**
   * GET /api/plinko/my-history
   */
  public static async getMyHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id || (req as any).user?._id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const history = await PlinkoEngine.getInstance().getUserHistory(userId, limit);

      res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  /**
   * GET /api/plinko/stats
   */
  public static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await PlinkoEngine.getInstance().getStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: (err as Error).message });
    }
  }
}
