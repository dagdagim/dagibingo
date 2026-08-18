import { Request, Response } from 'express';
import { KenoEngine } from '../../game-engine/KenoEngine';
import { KenoRound } from '../../models/KenoRound';
import { KenoTicket } from '../../models/KenoTicket';
import { KENO_PAYTABLE, KENO_TOTAL_NUMBERS } from '../../shared';

export class KenoController {
  /**
   * GET /api/keno/live-round
   */
  public static async getLiveRound(req: Request, res: Response): Promise<void> {
    try {
      const activeState = KenoEngine.getInstance().getActiveRound();
      res.json({
        success: true,
        data: {
          ...activeState,
          paytable: KENO_PAYTABLE,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  /**
   * POST /api/keno/bet
   */
  public static async placeBet(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || (req as any).user?.id || (req as any).user?._id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Please sign in to place live bets.' });
        return;
      }

      const { selectedNumbers, betAmount } = req.body;

      const ticket = await KenoEngine.getInstance().placeBet({
        userId,
        selectedNumbers,
        betAmount: Number(betAmount),
      });

      res.status(201).json({
        success: true,
        message: 'Keno bet placed successfully!',
        data: ticket,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: (err as Error).message });
    }
  }

  /**
   * POST /api/keno/quick-play
   */
  public static async quickPlay(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || (req as any).user?.id || (req as any).user?._id;
      const { selectedNumbers, betAmount } = req.body;

      const result = await KenoEngine.getInstance().playQuickGame({
        userId: userId || (null as any),
        selectedNumbers,
        betAmount: Number(betAmount),
      });

      res.status(200).json({
        success: true,
        message: result.ticket.status === 'WON' ? 'Congratulations, You Won!' : 'Round completed.',
        data: result,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: (err as Error).message });
    }
  }

  /**
   * GET /api/keno/my-tickets
   */
  public static async getMyTickets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId || (req as any).user?.id || (req as any).user?._id;
      if (!userId) {
        res.json({
          success: true,
          data: [],
        });
        return;
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const tickets = await KenoTicket.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);

      res.json({
        success: true,
        data: tickets,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: (err as Error).message });
    }
  }

  /**
   * GET /api/keno/stats
   */
  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const recentRounds = await KenoRound.find({ status: 'COMPLETED' })
        .sort({ roundNumber: -1 })
        .limit(50);

      // Frequency map for 1-80
      const frequencyMap: Record<number, number> = {};
      for (let i = 1; i <= KENO_TOTAL_NUMBERS; i++) {
        frequencyMap[i] = 0;
      }

      recentRounds.forEach((round) => {
        round.drawnNumbers.forEach((num) => {
          if (frequencyMap[num] !== undefined) {
            frequencyMap[num]++;
          }
        });
      });

      const sorted = Object.entries(frequencyMap).map(([num, freq]) => ({
        number: parseInt(num, 10),
        frequency: freq,
      }));

      sorted.sort((a, b) => b.frequency - a.frequency);

      const hotNumbers = sorted.slice(0, 10);
      const coldNumbers = sorted.slice(-10).reverse();

      res.json({
        success: true,
        data: {
          totalDraws: recentRounds.length,
          hotNumbers,
          coldNumbers,
          lastDraws: recentRounds.slice(0, 10).map((r) => ({
            roundNumber: r.roundNumber,
            numbers: r.drawnNumbers,
            timestamp: r.createdAt,
          })),
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: (err as Error).message });
    }
  }
}
