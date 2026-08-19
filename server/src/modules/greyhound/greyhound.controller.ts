import { Request, Response, NextFunction } from 'express';
import { GreyhoundEngine } from '../../game-engine/GreyhoundEngine';
import { User } from '../../models/User';

const greyhoundEngine = GreyhoundEngine.getInstance();

export const placeGreyhoundBet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { betType, trapNumber, secondTrapNumber, betAmount } = req.body;

    const parsedTrap = Number(trapNumber);
    const parsedBet = Number(betAmount);
    const parsedSecond = secondTrapNumber !== undefined ? Number(secondTrapNumber) : undefined;

    if (!['WIN', 'PLACE', 'EXACTA'].includes(betType)) {
      res.status(400).json({ success: false, message: 'Invalid bet type. Choose WIN, PLACE, or EXACTA.' });
      return;
    }

    if (isNaN(parsedTrap) || parsedTrap < 1 || parsedTrap > 6) {
      res.status(400).json({ success: false, message: 'Invalid trap number (1-6).' });
      return;
    }

    if (isNaN(parsedBet) || parsedBet < 0.5) {
      res.status(400).json({ success: false, message: 'Minimum bet is 0.5 ETB.' });
      return;
    }

    const user = await User.findById(userId);
    const username = user?.username || 'HoundPunter';

    const result = await greyhoundEngine.placeBet(
      userId,
      username,
      betType,
      parsedTrap,
      parsedBet,
      parsedSecond
    );

    res.status(201).json({
      success: true,
      bet: result.bet,
      newBalance: result.newBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentRound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const state = await greyhoundEngine.getActiveState(userId);

    res.status(200).json({
      success: true,
      data: state,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyGreyhoundHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Number(req.query.limit) || 20;
    const history = await greyhoundEngine.getMyHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const getGreyhoundStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await greyhoundEngine.getStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
