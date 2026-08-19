import { Request, Response, NextFunction } from 'express';
import { HorseRaceEngine } from '../../game-engine/HorseRaceEngine';
import { User } from '../../models/User';

const horseRaceEngine = HorseRaceEngine.getInstance();

export const placeHorseBet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { betType, horseNumber, secondHorseNumber, betAmount } = req.body;

    const parsedHorse = Number(horseNumber);
    const parsedBet = Number(betAmount);
    const parsedSecond = secondHorseNumber !== undefined ? Number(secondHorseNumber) : undefined;

    if (!['WIN', 'PLACE', 'EXACTA'].includes(betType)) {
      res.status(400).json({ success: false, message: 'Invalid bet type. Choose WIN, PLACE, or EXACTA.' });
      return;
    }

    if (isNaN(parsedHorse) || parsedHorse < 1 || parsedHorse > 6) {
      res.status(400).json({ success: false, message: 'Invalid horse number (1-6).' });
      return;
    }

    if (isNaN(parsedBet) || parsedBet < 0.5) {
      res.status(400).json({ success: false, message: 'Minimum bet is 0.5 ETB.' });
      return;
    }

    const user = await User.findById(userId);
    const username = user?.username || 'DerbyPilot';

    const result = await horseRaceEngine.placeBet(
      userId,
      username,
      betType,
      parsedHorse,
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
    const state = await horseRaceEngine.getActiveState(userId);

    res.status(200).json({
      success: true,
      data: state,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyHorseHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Number(req.query.limit) || 20;
    const history = await horseRaceEngine.getMyHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const getHorseRaceStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await horseRaceEngine.getStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
