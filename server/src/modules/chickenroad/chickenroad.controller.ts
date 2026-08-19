import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { ChickenRoadGame, IChickenRoadGame } from '../../models/ChickenRoadGame';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { User } from '../../models/User';
import {
  ChickenRoadDifficulty,
  ChickenSkinType,
  ChickenStageTheme,
  IChickenRoadGameDTO,
  ChickenLiveRunDTO,
} from '../../shared';

export const PROGRESSIVE_ROAD_MULTIPLIERS = [
  1.0,   // Start (0)
  1.15,  // Road 1
  1.40,  // Road 2
  1.80,  // Road 3
  2.40,  // Road 4
  3.20,  // Road 5 (Checkpoint 🏁)
  4.50,  // Road 6
  6.80,  // Road 7
  10.00, // Road 8
  15.00, // Road 9
  25.00, // Road 10 (Gold Checkpoint 🏆)
  35.00, // Road 11
  50.00, // Road 12
  75.00, // Road 13
  110.0, // Road 14
  165.0, // Road 15
  250.0, // Road 16
  380.0, // Road 17
  580.0, // Road 18
  900.0, // Road 19
  1400.0, // Road 20
  2200.0, // Road 21
  3500.0, // Road 22
  5500.0, // Road 23
  8000.0, // Road 24
  12500.0, // Road 25 (Ultimate Finish 👑)
];

export function getStageThemeForRoad(roadIndex: number): ChickenStageTheme {
  if (roadIndex <= 4) return 'COUNTRY';
  if (roadIndex <= 8) return 'HIGHWAY';
  if (roadIndex <= 13) return 'CITY';
  if (roadIndex <= 18) return 'NIGHT';
  return 'SPEEDWAY';
}

function generateChickenRoadLayout(seed: string): boolean[] {
  const layout: boolean[] = [];
  let hash = crypto.createHash('sha256').update(seed).digest('hex');

  // Survival probability starts high (95%) and tapers smoothly down to 78% on late roads
  for (let r = 1; r <= 25; r++) {
    const byteIdx = (r * 4) % (hash.length - 4);
    const intVal = parseInt(hash.substring(byteIdx, byteIdx + 4), 16);
    const randFloat = intVal / 0xffff;

    // Survival curve: 95% down to 80%
    const survivalRate = Math.max(0.75, 0.96 - (r * 0.007));
    const isSafe = randFloat <= survivalRate;
    layout.push(isSafe);

    if (r % 6 === 0) {
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
    skin: game.skin,
    betAmount: game.betAmount,
    currentRoad: game.currentRoad,
    currentMultiplier: game.currentMultiplier,
    autoStopMultiplier: game.autoStopMultiplier,
    status: game.status,
    payoutAmount: game.payoutAmount,
    stageTheme: game.stageTheme,
    revealedRoads: game.revealedRoads,
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

    const {
      difficulty = 'MEDIUM',
      skin = 'CLASSIC',
      betAmount,
      autoStopMultiplier,
    } = req.body;

    const parsedBet = Number(betAmount);
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
      res.status(400).json({
        success: false,
        message: `Insufficient balance. You have ${userWallet?.availableBalance || 0} ETB.`,
      });
      return;
    }

    // Debit player wallet
    const userBalBefore = userWallet.availableBalance;
    userWallet.availableBalance -= parsedBet;
    await userWallet.save();

    const serverSeed = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const fullRoadLayout = generateChickenRoadLayout(serverSeed);

    const game = await ChickenRoadGame.create({
      userId: new mongoose.Types.ObjectId(userId),
      username: user?.username || 'Clucker',
      difficulty: difficulty as ChickenRoadDifficulty,
      skin: skin as ChickenSkinType,
      betAmount: parsedBet,
      currentRoad: 0,
      currentMultiplier: 1.0,
      autoStopMultiplier: autoStopMultiplier ? Number(autoStopMultiplier) : undefined,
      status: 'IN_PROGRESS',
      payoutAmount: 0,
      stageTheme: 'COUNTRY',
      fullRoadLayout,
      revealedRoads: [],
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
      description: `Chicken Road Entry (${skin} skin, ${parsedBet} ETB)`,
      referenceId: game._id.toString(),
      metadata: {
        gameType: 'CHICKEN_ROAD',
        skin,
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
      res.status(404).json({ success: false, message: 'Active game not found.' });
      return;
    }

    const targetRoadIdx = game.currentRoad; // 0 for Road 1
    if (targetRoadIdx >= 25) {
      res.status(400).json({ success: false, message: 'You have already reached the finish line!' });
      return;
    }

    const isRoadSafe = game.fullRoadLayout[targetRoadIdx];

    game.revealedRoads.push({
      roadIndex: targetRoadIdx + 1,
      isSafe: isRoadSafe,
    });

    if (!isRoadSafe) {
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
    const newRoadNumber = targetRoadIdx + 1;
    const newMultiplier = PROGRESSIVE_ROAD_MULTIPLIERS[newRoadNumber];
    game.currentRoad = newRoadNumber;
    game.currentMultiplier = newMultiplier;
    game.stageTheme = getStageThemeForRoad(newRoadNumber);

    // Auto-Stop check or Ultimate Finish (Road 25)
    const shouldAutoCollect =
      (game.autoStopMultiplier && newMultiplier >= game.autoStopMultiplier) ||
      newRoadNumber === 25;

    if (shouldAutoCollect) {
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
          description: `Chicken Road Auto Collect (${newMultiplier}x on Road ${newRoadNumber})`,
          referenceId: game._id.toString(),
        });

        // House Admin Debit
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
          outcome: newRoadNumber === 25 ? 'FINISH_LINE_VICTORY' : 'AUTO_COLLECT_WIN',
          newBalance: userWallet.availableBalance,
        });
        return;
      }
    }

    await game.save();

    res.status(200).json({
      success: true,
      game: formatChickenRoadDTO(game),
      outcome: 'SAFE',
    });
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
      res.status(400).json({ success: false, message: 'You must cross at least one road before collecting.' });
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
        description: `Chicken Road Collect (${game.currentMultiplier}x, Road ${game.currentRoad})`,
        referenceId: game._id.toString(),
      });

      // House Admin Debit
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
 * GET /api/chickenroad/live-runs
 */
export const getChickenLiveRuns = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Return recent outcomes and simulated active players
    const recentGames = await ChickenRoadGame.find({
      status: { $in: ['CASHED_OUT', 'CRASHED'] },
    })
      .sort({ createdAt: -1 })
      .limit(10);

    const liveRuns: ChickenLiveRunDTO[] = recentGames.map((g) => ({
      id: g._id.toString(),
      username: g.username,
      skin: g.skin,
      currentRoad: g.currentRoad,
      multiplier: g.currentMultiplier,
      status: g.status === 'CASHED_OUT' ? 'WON' : 'CRASHED',
      payoutAmount: g.payoutAmount,
      timestamp: g.updatedAt.toISOString(),
    }));

    // Add lively community demo runners if list is small
    const simulatedDemoRunners: ChickenLiveRunDTO[] = [
      { id: 'sim_1', username: 'Alex', skin: 'ROYAL', currentRoad: 5, multiplier: 3.20, status: 'WON', payoutAmount: 64.0, timestamp: new Date().toISOString() },
      { id: 'sim_2', username: 'Daniel', skin: 'NINJA', currentRoad: 8, multiplier: 10.0, status: 'WON', payoutAmount: 250.0, timestamp: new Date(Date.now() - 15000).toISOString() },
      { id: 'sim_3', username: 'Sarah', skin: 'COWBOY', currentRoad: 3, multiplier: 1.80, status: 'WON', payoutAmount: 36.0, timestamp: new Date(Date.now() - 32000).toISOString() },
      { id: 'sim_4', username: 'Michael', skin: 'GOLDEN', currentRoad: 10, multiplier: 25.0, status: 'WON', payoutAmount: 500.0, timestamp: new Date(Date.now() - 48000).toISOString() },
    ];

    res.status(200).json({
      success: true,
      data: [...liveRuns, ...simulatedDemoRunners].slice(0, 10),
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
        skin: g.skin,
        betAmount: g.betAmount,
        reachedRoad: g.currentRoad,
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
