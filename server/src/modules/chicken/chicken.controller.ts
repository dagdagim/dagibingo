import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { ChickenGame, IChickenGame } from '../../models/ChickenGame';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { User } from '../../models/User';
import {
  ChickenDifficulty,
  ChickenLaneOutcome,
  IChickenGameDTO,
  IChickenDifficultyConfig,
} from '../../shared';

export const CHICKEN_CONFIG: Record<ChickenDifficulty, IChickenDifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Country Trail (24 Lanes • Low Risk)',
    totalLanes: 24,
    safeChance: 0.958,
    multipliers: [
      1.01, 1.05, 1.1, 1.15, 1.2, 1.25, 1.31, 1.37, 1.43, 1.5, 1.57, 1.65, 1.74, 1.83, 1.94, 2.05,
      2.18, 2.32, 2.49, 2.68, 2.92, 3.22, 3.65, 4.45,
    ],
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'Highway Sprint (18 Lanes • Medium Risk)',
    totalLanes: 18,
    safeChance: 0.833,
    multipliers: [
      1.16, 1.39, 1.67, 2.01, 2.41, 2.89, 3.47, 4.16, 5.0, 6.0, 7.2, 8.64, 10.37, 12.44, 14.93,
      17.92, 21.5, 25.8,
    ],
  },
  HARD: {
    name: 'HARD',
    label: 'Expressway Madness (12 Lanes • High Risk)',
    totalLanes: 12,
    safeChance: 0.667,
    multipliers: [1.45, 2.18, 3.27, 4.91, 7.36, 11.04, 16.56, 24.84, 37.26, 55.89, 83.84, 125.75],
  },
  DAREDEVIL: {
    name: 'DAREDEVIL',
    label: 'Barbecue Inferno (10 Lanes • Extreme Risk)',
    totalLanes: 10,
    safeChance: 0.5,
    multipliers: [1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64, 993.28],
  },
};

/**
 * Generate predetermined lane outcomes via cryptographic hashing
 */
function generateChickenLanes(difficulty: ChickenDifficulty, seed: string): ChickenLaneOutcome[] {
  const config = CHICKEN_CONFIG[difficulty];
  const outcomes: ChickenLaneOutcome[] = [];

  let hash = crypto.createHash('sha256').update(seed).digest('hex');

  for (let i = 0; i < config.totalLanes; i++) {
    const byteIdx = (i * 4) % (hash.length - 4);
    const intVal = parseInt(hash.substring(byteIdx, byteIdx + 4), 16);
    const uniform = intVal / 0xffff; // in [0, 1)

    const isSafe = uniform < config.safeChance;
    outcomes.push(isSafe ? 'SAFE' : 'HAZARD');

    if (i % 6 === 5) {
      hash = crypto.createHash('sha256').update(hash).digest('hex');
    }
  }

  return outcomes;
}

function formatChickenDTO(game: IChickenGame): IChickenGameDTO {
  const config = CHICKEN_CONFIG[game.difficulty];

  return {
    id: game._id.toString(),
    userId: game.userId.toString(),
    username: game.username,
    difficulty: game.difficulty,
    betAmount: game.betAmount,
    currentStep: game.currentStep,
    currentMultiplier: game.currentMultiplier,
    status: game.status,
    payoutAmount: game.payoutAmount,
    stepHistory: game.stepHistory,
    totalLanes: config.totalLanes,
    multipliers: config.multipliers,
    hash: game.hash,
    serverSeed: game.status !== 'IN_PROGRESS' ? game.serverSeed : undefined,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}

/**
 * POST /api/chicken/start
 */
export const startChickenGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { difficulty = 'MEDIUM', betAmount } = req.body;
    const parsedBet = Number(betAmount);

    if (!CHICKEN_CONFIG[difficulty as ChickenDifficulty]) {
      res.status(400).json({ success: false, message: 'Invalid difficulty. Choose EASY, MEDIUM, HARD, or DAREDEVIL.' });
      return;
    }

    if (isNaN(parsedBet) || parsedBet < 0.5) {
      res.status(400).json({ success: false, message: 'Minimum bet is 0.5 ETB.' });
      return;
    }

    // Check active game
    const existing = await ChickenGame.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: 'You already have an active Chicken Run in progress.',
        game: formatChickenDTO(existing),
      });
      return;
    }

    const user = await User.findById(userId);
    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!userWallet || userWallet.availableBalance < parsedBet) {
      res.status(400).json({ success: false, message: `Insufficient balance. You have ${userWallet?.availableBalance || 0} ETB.` });
      return;
    }

    // Debit player wallet (GAME_ENTRY)
    const userBalBefore = userWallet.availableBalance;
    userWallet.availableBalance -= parsedBet;
    await userWallet.save();

    const serverSeed = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const laneOutcomes = generateChickenLanes(difficulty as ChickenDifficulty, serverSeed);

    const game = await ChickenGame.create({
      userId: new mongoose.Types.ObjectId(userId),
      username: user?.username || 'RoadCrosser',
      difficulty: difficulty as ChickenDifficulty,
      betAmount: parsedBet,
      currentStep: 0,
      currentMultiplier: 1.0,
      status: 'IN_PROGRESS',
      payoutAmount: 0,
      laneOutcomes,
      stepHistory: [],
      hash,
      serverSeed,
    });

    await WalletTransaction.create({
      walletId: userWallet._id,
      userId: new mongoose.Types.ObjectId(userId),
      type: 'GAME_ENTRY',
      amount: parsedBet,
      balanceBefore: userBalBefore,
      balanceAfter: userWallet.availableBalance,
      currency: 'ETB',
      status: 'COMPLETED',
      description: `Chicken Run Entry (${difficulty} ${parsedBet} ETB)`,
      referenceId: game._id.toString(),
      metadata: {
        gameType: 'CHICKEN_RUN',
        difficulty,
        gameId: game._id.toString(),
      },
    });

    // Credit house admin
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (adminUser) {
      const adminWallet = await Wallet.findOne({ userId: adminUser._id });
      if (adminWallet) {
        const adminBalBefore = adminWallet.availableBalance;
        adminWallet.availableBalance += parsedBet;
        await adminWallet.save();

        await WalletTransaction.create({
          walletId: adminWallet._id,
          userId: adminUser._id,
          type: 'DEPOSIT',
          amount: parsedBet,
          balanceBefore: adminBalBefore,
          balanceAfter: adminWallet.availableBalance,
          currency: 'ETB',
          status: 'COMPLETED',
          description: `House Stake from ${user?.username} (Chicken Run #${game._id})`,
          referenceId: game._id.toString(),
        });
      }
    }

    res.status(201).json({
      success: true,
      game: formatChickenDTO(game),
      newBalance: userWallet.availableBalance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chicken/step
 */
export const stepChickenGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { gameId } = req.body;

    const game = await ChickenGame.findOne({
      _id: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) {
      res.status(404).json({ success: false, message: 'Active Chicken Run game not found.' });
      return;
    }

    const config = CHICKEN_CONFIG[game.difficulty];
    const targetStep = game.currentStep; // 0-indexed

    if (targetStep >= config.totalLanes) {
      res.status(400).json({ success: false, message: 'Already reached the Golden Egg Barn!' });
      return;
    }

    const outcome = game.laneOutcomes[targetStep];

    if (outcome === 'HAZARD') {
      // ROASTED CHICKEN!
      game.status = 'BUSTED';
      game.payoutAmount = 0;
      game.stepHistory.push({
        step: targetStep + 1,
        outcome: 'HAZARD',
        multiplier: 0,
      });
      await game.save();

      res.status(200).json({
        success: true,
        game: formatChickenDTO(game),
        outcome: 'HAZARD',
      });
      return;
    }

    // SAFE STEP!
    const newMultiplier = config.multipliers[targetStep];
    game.currentStep += 1;
    game.currentMultiplier = newMultiplier;
    game.stepHistory.push({
      step: targetStep + 1,
      outcome: 'SAFE',
      multiplier: newMultiplier,
    });

    if (game.currentStep === config.totalLanes) {
      // REACHED THE GOLDEN EGG BARN! Auto Cashout
      const totalPayout = Math.floor(game.betAmount * newMultiplier * 100) / 100;
      game.status = 'CASHED_OUT';
      game.payoutAmount = totalPayout;
      await game.save();

      // Settle Payout
      const userWallet = await Wallet.findOne({ userId: game.userId });
      if (userWallet) {
        const userBalBefore = userWallet.availableBalance;
        userWallet.availableBalance += totalPayout;
        await userWallet.save();

        await WalletTransaction.create({
          walletId: userWallet._id,
          userId: game.userId,
          type: 'PRIZE',
          amount: totalPayout,
          balanceBefore: userBalBefore,
          balanceAfter: userWallet.availableBalance,
          currency: 'ETB',
          status: 'COMPLETED',
          description: `Chicken Run Golden Egg Win (${game.difficulty} ${newMultiplier}x)`,
          referenceId: game._id.toString(),
        });

        // Debit Admin
        const adminUser = await User.findOne({ role: 'ADMIN' });
        if (adminUser) {
          const adminWallet = await Wallet.findOne({ userId: adminUser._id });
          if (adminWallet) {
            const adminBalBefore = adminWallet.availableBalance;
            adminWallet.availableBalance -= totalPayout;
            await adminWallet.save();

            await WalletTransaction.create({
              walletId: adminWallet._id,
              userId: adminUser._id,
              type: 'WITHDRAWAL',
              amount: totalPayout,
              balanceBefore: adminBalBefore,
              balanceAfter: adminWallet.availableBalance,
              currency: 'ETB',
              status: 'COMPLETED',
              description: `House Chicken Run Payout to ${game.username}`,
              referenceId: game._id.toString(),
            });
          }
        }

        res.status(200).json({
          success: true,
          game: formatChickenDTO(game),
          outcome: 'GOLDEN_EGG_WIN',
          newBalance: userWallet.availableBalance,
        });
        return;
      }
    } else {
      await game.save();

      res.status(200).json({
        success: true,
        game: formatChickenDTO(game),
        outcome: 'SAFE',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chicken/cashout
 */
export const cashoutChickenGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { gameId } = req.body;

    const game = await ChickenGame.findOne({
      _id: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) {
      res.status(404).json({ success: false, message: 'Active Chicken Run game not found.' });
      return;
    }

    if (game.currentStep === 0) {
      res.status(400).json({ success: false, message: 'Cross at least one lane before cashing out.' });
      return;
    }

    const payoutAmount = Math.floor(game.betAmount * game.currentMultiplier * 100) / 100;
    game.status = 'CASHED_OUT';
    game.payoutAmount = payoutAmount;
    await game.save();

    // Settle Player Wallet
    const userWallet = await Wallet.findOne({ userId: game.userId });
    let newBalance = 0;
    if (userWallet) {
      const userBalBefore = userWallet.availableBalance;
      userWallet.availableBalance += payoutAmount;
      await userWallet.save();
      newBalance = userWallet.availableBalance;

      await WalletTransaction.create({
        walletId: userWallet._id,
        userId: game.userId,
        type: 'PRIZE',
        amount: payoutAmount,
        balanceBefore: userBalBefore,
        balanceAfter: userWallet.availableBalance,
        currency: 'ETB',
        status: 'COMPLETED',
        description: `Chicken Run Cashout (${game.difficulty} ${game.currentMultiplier}x, Step ${game.currentStep})`,
        referenceId: game._id.toString(),
      });

      // Debit House Admin
      const adminUser = await User.findOne({ role: 'ADMIN' });
      if (adminUser) {
        const adminWallet = await Wallet.findOne({ userId: adminUser._id });
        if (adminWallet) {
          const adminBalBefore = adminWallet.availableBalance;
          adminWallet.availableBalance -= payoutAmount;
          await adminWallet.save();

          await WalletTransaction.create({
            walletId: adminWallet._id,
            userId: adminUser._id,
            type: 'WITHDRAWAL',
            amount: payoutAmount,
            balanceBefore: adminBalBefore,
            balanceAfter: adminWallet.availableBalance,
            currency: 'ETB',
            status: 'COMPLETED',
            description: `House Chicken Run Payout to ${game.username}`,
            referenceId: game._id.toString(),
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      game: formatChickenDTO(game),
      newBalance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chicken/active
 */
export const getActiveChickenGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(200).json({ success: true, game: null });
      return;
    }

    const game = await ChickenGame.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    res.status(200).json({
      success: true,
      game: game ? formatChickenDTO(game) : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chicken/my-history
 */
export const getMyChickenHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Number(req.query.limit) || 20;
    const history = await ChickenGame.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['CASHED_OUT', 'BUSTED'] },
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));

    res.status(200).json({
      success: true,
      data: history.map((g) => ({
        id: g._id.toString(),
        difficulty: g.difficulty,
        betAmount: g.betAmount,
        reachedStep: g.currentStep,
        multiplier: g.currentMultiplier,
        payoutAmount: g.payoutAmount,
        status: g.status,
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
};
