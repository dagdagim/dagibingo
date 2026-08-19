import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AviatorEngine } from '../../game-engine/AviatorEngine';
import { AviatorBet } from '../../models/AviatorBet';
import { AviatorRound } from '../../models/AviatorRound';
import { Wallet } from '../../models/Wallet';
import { User } from '../../models/User';

const aviatorEngine = AviatorEngine.getInstance();

export const placeBet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { panelIndex, betAmount, autoCashoutMultiplier } = req.body;

    if (panelIndex !== 0 && panelIndex !== 1) {
      res.status(400).json({ success: false, message: 'Invalid panel index. Must be 0 or 1.' });
      return;
    }

    if (!betAmount || typeof betAmount !== 'number' || betAmount < 0.5) {
      res.status(400).json({ success: false, message: 'Minimum bet is 0.5 ETB' });
      return;
    }

    const user = await User.findById(userId);
    const username = user?.username || 'Pilot';

    const bet = await aviatorEngine.placeBet(
      userId,
      username,
      panelIndex,
      betAmount,
      autoCashoutMultiplier
    );

    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    res.status(201).json({
      success: true,
      bet: {
        id: bet._id.toString(),
        roundNumber: bet.roundNumber,
        panelIndex: bet.panelIndex,
        betAmount: bet.betAmount,
        autoCashoutMultiplier: bet.autoCashoutMultiplier,
        status: bet.status,
      },
      newBalance: userWallet?.availableBalance || 0,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { panelIndex } = req.body;
    if (panelIndex !== 0 && panelIndex !== 1) {
      res.status(400).json({ success: false, message: 'Invalid panel index.' });
      return;
    }

    const result = await aviatorEngine.cancelBet(userId, panelIndex);
    res.status(200).json({
      success: result.success,
      refundedAmount: result.refundedAmount,
      newBalance: result.newBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const cashout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { panelIndex } = req.body;
    const currentRound = aviatorEngine.getCurrentRound();
    if (!currentRound || currentRound.status !== 'FLYING') {
      res.status(400).json({ success: false, message: 'Flight is not in progress.' });
      return;
    }

    const bet = await AviatorBet.findOne({
      roundNumber: currentRound.roundNumber,
      userId: new mongoose.Types.ObjectId(userId),
      panelIndex: panelIndex || 0,
      status: 'ACTIVE',
    });

    if (!bet) {
      res.status(400).json({ success: false, message: 'No active bet to cash out.' });
      return;
    }

    const result = await aviatorEngine.executeCashout(bet);
    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    res.status(200).json({
      success: true,
      payoutAmount: result.payoutAmount,
      multiplier: result.multiplier,
      newBalance: userWallet?.availableBalance || 0,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentRound = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const state = await aviatorEngine.getActiveState(userId);
    res.status(200).json({ success: true, data: state });
  } catch (error) {
    next(error);
  }
};

export const getMyHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const bets = await AviatorBet.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: bets.map((b) => ({
        id: b._id.toString(),
        roundNumber: b.roundNumber,
        panelIndex: b.panelIndex,
        betAmount: b.betAmount,
        autoCashoutMultiplier: b.autoCashoutMultiplier,
        cashedOutMultiplier: b.cashedOutMultiplier,
        payoutAmount: b.payoutAmount,
        status: b.status,
        createdAt: (b as any).createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const totalRounds = await AviatorRound.countDocuments({ status: 'CRASHED' });
    const totalBets = await AviatorBet.countDocuments();

    const topWin = await AviatorBet.findOne({ status: 'CASHED_OUT' }).sort({ payoutAmount: -1 });
    const topMult = await AviatorRound.findOne({ status: 'CRASHED' }).sort({ crashMultiplier: -1 });

    const recentRounds = await AviatorRound.find({ status: 'CRASHED' })
      .sort({ roundNumber: -1 })
      .limit(25);

    res.status(200).json({
      success: true,
      data: {
        totalRounds,
        totalBets,
        highestMultiplier: topMult?.crashMultiplier || 1.0,
        highestPayout: topWin?.payoutAmount || 0,
        recentMultipliers: recentRounds.map((r) => r.crashMultiplier),
      },
    });
  } catch (error) {
    next(error);
  }
};
