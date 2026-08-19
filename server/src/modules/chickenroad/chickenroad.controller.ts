import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { ChickenRoadGame, IChickenRoadGame } from '../../models/ChickenRoadGame';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { User } from '../../models/User';
import {
  ChickenRoadDifficulty,
  IChickenRoadGameDTO,
  IChickenRoadDifficultyConfig,
} from '../../shared';

export const CHICKEN_ROAD_CONFIG: Record<ChickenRoadDifficulty, IChickenRoadDifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Country Road (95% Safe/Lane)',
    totalLanes: 25,
    safeProbability: 0.95,
    multipliers: [
      1.02, 1.07, 1.13, 1.19, 1.25, 1.32, 1.39, 1.46, 1.54, 1.62,
      1.71, 1.80, 1.90, 2.00, 2.11, 2.22, 2.34, 2.47, 2.60, 2.74,
      2.89, 3.05, 3.22, 3.40, 3.59,
    ],
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'City Avenue (85% Safe/Lane)',
    totalLanes: 25,
    safeProbability: 0.85,
    multipliers: [
      1.14, 1.34, 1.58, 1.86, 2.19, 2.57, 3.03, 3.56, 4.19, 4.93,
      5.80, 6.82, 8.03, 9.45, 11.12, 13.08, 15.39, 18.11, 21.31, 25.07,
      29.49, 34.69, 40.81, 48.01, 56.48,
    ],
  },
  HARD: {
    name: 'HARD',
    label: 'Interstate Highway (70% Safe/Lane)',
    totalLanes: 25,
    safeProbability: 0.7,
    multipliers: [
      1.38, 1.98, 2.82, 4.04, 5.77, 8.24, 11.77, 16.82, 24.03, 34.33,
      49.04, 70.06, 100.08, 142.98, 204.25, 291.79, 416.84, 595.49, 850.70, 1215.28,
      1736.12, 2480.17, 3543.10, 5061.57, 7230.82,
    ],
  },
  DAREDEVIL: {
    name: 'DAREDEVIL',
    label: 'Speedway Rush (50% Safe/Lane)',
    totalLanes: 20,
    safeProbability: 0.5,
    multipliers: [
      1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64, 993.28,
      1986.56, 3973.12, 7946.24, 15892.48, 31784.96, 63569.92, 127139.84, 254279.68, 508559.36, 1017118.72,
    ],
  },
};

/**
 * Generate 25-lane hazard layout based on cryptographic seed
 */
function generateChickenLaneLayout(difficulty: ChickenRoadDifficulty, seed: string): boolean[] {
  const config = CHICKEN_ROAD_CONFIG[difficulty];
  const layout: boolean[] = [];

  let hash = crypto.createHash('sha256').update(seed).digest('hex');

  for (let l = 0; l < config.totalLanes; l++) {
    const byteIdx = (l * 4) % (hash.length - 4);
    const intVal = parseInt(hash.substring(byteIdx, byteIdx + 4), 16);
    const randFloat = intVal / 0xffff; // uniform in [0, 1)

    // isSafe if randFloat <= safeProbability
    const isSafe = randFloat <= config.safeProbability;
    layout.push(isSafe);

    if (l % 8 === 0) {
      hash = crypto.createHash('sha256').update(hash).digest('hex');
    }
  }

  return layout;
}

function formatChickenRoadDTO(game: IChickenRoadGame): IChickenRoadGameDTO {
  return {
    id: game._id.toString(),
    userId: game.userId.toString(),
    username: game.username,
    difficulty: game.difficulty,
    betAmount: game.betAmount,
    currentLane: game.currentLane,
    currentMultiplier: game.currentMultiplier,
    status: game.status,
    payoutAmount: game.payoutAmount,
    revealedLanes: game.revealedLanes,
    hash: game.hash,
    serverSeed: game.status !== 'IN_PROGRESS' ? game.serverSeed : undefined,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}

/**
 * POST /api/chickenroad/start
 */
export const startChickenRoadGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { difficulty = 'EASY', betAmount } = req.body;
    const parsedBet = Number(betAmount);

    if (!CHICKEN_ROAD_CONFIG[difficulty as ChickenRoadDifficulty]) {
      res.status(400).json({ success: false, message: 'Invalid difficulty. Choose EASY, MEDIUM, HARD, or DAREDEVIL.' });
      return;
    }

    if (isNaN(parsedBet) || parsedBet < 0.5) {
      res.status(400).json({ success: false, message: 'Minimum bet is 0.5 ETB.' });
      return;
    }

    // Check active game
    const existing = await ChickenRoadGame.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: 'You already have an active Chicken Road run in progress.',
        game: formatChickenRoadDTO(existing),
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
    const fullLaneLayout = generateChickenLaneLayout(difficulty as ChickenRoadDifficulty, serverSeed);

    const game = await ChickenRoadGame.create({
      userId: new mongoose.Types.ObjectId(userId),
      username: user?.username || 'Clucker',
      difficulty: difficulty as ChickenRoadDifficulty,
      betAmount: parsedBet,
      currentLane: 0,
      currentMultiplier: 1.0,
      status: 'IN_PROGRESS',
      payoutAmount: 0,
      fullLaneLayout,
      revealedLanes: [],
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
      description: `Chicken Road Entry (${difficulty} ${parsedBet} ETB)`,
      referenceId: game._id.toString(),
      metadata: {
        gameType: 'CHICKEN_ROAD',
        difficulty,
        gameId: game._id.toString(),
      },
    });

    // Credit house admin for stake
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
          description: `House Stake from ${user?.username} (Chicken Road #${game._id})`,
          referenceId: game._id.toString(),
        });
      }
    }

    res.status(201).json({
      success: true,
      game: formatChickenRoadDTO(game),
      newBalance: userWallet.availableBalance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chickenroad/step
 */
export const stepChickenRoadGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { gameId } = req.body;

    const game = await ChickenRoadGame.findOne({
      _id: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) {
      res.status(404).json({ success: false, message: 'Active crossing run not found.' });
      return;
    }

    const config = CHICKEN_ROAD_CONFIG[game.difficulty];
    const targetLane = game.currentLane;

    if (targetLane >= config.totalLanes) {
      res.status(400).json({ success: false, message: 'You have already crossed the entire highway!' });
      return;
    }

    const isLaneSafe = game.fullLaneLayout[targetLane];

    game.revealedLanes.push({
      laneIndex: targetLane,
      isSafe: isLaneSafe,
    });

    if (!isLaneSafe) {
      // CAR CRASH!
      game.status = 'CRASHED';
      game.payoutAmount = 0;
      await game.save();

      res.status(200).json({
        success: true,
        game: formatChickenRoadDTO(game),
        outcome: 'CRASHED',
      });
      return;
    }

    // SAFE HOP!
    const newMultiplier = config.multipliers[targetLane];
    game.currentMultiplier = newMultiplier;

    if (targetLane === config.totalLanes - 1) {
      // FULL HIGHWAY CROSSED! Auto-cashout
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
          description: `Full Highway Cross Win (${game.difficulty} ${newMultiplier}x)`,
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
              description: `House Chicken Road Payout to ${game.username}`,
              referenceId: game._id.toString(),
            });
          }
        }

        res.status(200).json({
          success: true,
          game: formatChickenRoadDTO(game),
          outcome: 'FULL_CROSS_WIN',
          newBalance: userWallet.availableBalance,
        });
        return;
      }
    } else {
      game.currentLane += 1;
      await game.save();

      res.status(200).json({
        success: true,
        game: formatChickenRoadDTO(game),
        outcome: 'SAFE',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/chickenroad/cashout
 */
export const cashoutChickenRoadGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { gameId } = req.body;

    const game = await ChickenRoadGame.findOne({
      _id: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) {
      res.status(404).json({ success: false, message: 'Active game not found.' });
      return;
    }

    if (game.currentMultiplier <= 1.0) {
      res.status(400).json({ success: false, message: 'You must cross at least one lane before cashing out.' });
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
        description: `Chicken Road Cashout (${game.difficulty} ${game.currentMultiplier}x, Lane #${game.currentLane})`,
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
            description: `House Chicken Road Payout to ${game.username}`,
            referenceId: game._id.toString(),
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      game: formatChickenRoadDTO(game),
      newBalance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chickenroad/active
 */
export const getActiveChickenRoadGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(200).json({ success: true, game: null });
      return;
    }

    const game = await ChickenRoadGame.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    res.status(200).json({
      success: true,
      game: game ? formatChickenRoadDTO(game) : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/chickenroad/my-history
 */
export const getMyChickenRoadHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Number(req.query.limit) || 20;
    const history = await ChickenRoadGame.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['CASHED_OUT', 'CRASHED'] },
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));

    res.status(200).json({
      success: true,
      data: history.map((g) => ({
        id: g._id.toString(),
        difficulty: g.difficulty,
        betAmount: g.betAmount,
        reachedLane: g.currentLane,
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
