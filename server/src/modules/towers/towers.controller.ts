import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { TowersGame, ITowersGame } from '../../models/TowersGame';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { User } from '../../models/User';
import {
  TowersDifficulty,
  TowersTileType,
  ITowersGameDTO,
  ITowersDifficultyConfig,
} from '../../shared';

export const TOWERS_CONFIG: Record<TowersDifficulty, ITowersDifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Easy (3 Gems / 1 Skull)',
    tilesPerRow: 4,
    gemsPerRow: 3,
    skullsPerRow: 1,
    multipliers: [1.29, 1.72, 2.29, 3.06, 4.08, 5.44, 7.25, 9.67, 12.89],
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'Medium (2 Gems / 1 Skull)',
    tilesPerRow: 3,
    gemsPerRow: 2,
    skullsPerRow: 1,
    multipliers: [1.45, 2.18, 3.27, 4.91, 7.36, 11.04, 16.56, 24.84, 37.26],
  },
  HARD: {
    name: 'HARD',
    label: 'Hard (1 Gem / 1 Skull)',
    tilesPerRow: 2,
    gemsPerRow: 1,
    skullsPerRow: 1,
    multipliers: [1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64],
  },
  EXTREME: {
    name: 'EXTREME',
    label: 'Extreme (1 Gem / 2 Skulls)',
    tilesPerRow: 3,
    gemsPerRow: 1,
    skullsPerRow: 2,
    multipliers: [2.91, 8.73, 26.19, 78.57, 235.71, 707.13, 2121.39, 6364.17, 19092.51],
  },
  NIGHTMARE: {
    name: 'NIGHTMARE',
    label: 'Nightmare (1 Gem / 3 Skulls)',
    tilesPerRow: 4,
    gemsPerRow: 1,
    skullsPerRow: 3,
    multipliers: [3.88, 15.52, 62.08, 248.32, 993.28, 3973.12, 15892.48, 63569.92, 254279.68],
  },
};

/**
 * Generate full 9-row layout based on cryptographic seed
 */
function generateTowersLayout(difficulty: TowersDifficulty, seed: string): TowersTileType[][] {
  const config = TOWERS_CONFIG[difficulty];
  const layout: TowersTileType[][] = [];

  let hash = crypto.createHash('sha256').update(seed).digest('hex');

  for (let r = 0; r < 9; r++) {
    const row: TowersTileType[] = Array(config.tilesPerRow).fill('GEM');
    // Place skulls
    let skullsPlaced = 0;
    let byteIdx = (r * 4) % (hash.length - 2);

    while (skullsPlaced < config.skullsPerRow) {
      const val = parseInt(hash.substring(byteIdx, byteIdx + 2), 16);
      byteIdx = (byteIdx + 2) % (hash.length - 2);
      const targetPos = val % config.tilesPerRow;

      if (row[targetPos] !== 'SKULL') {
        row[targetPos] = 'SKULL';
        skullsPlaced++;
      }
    }

    layout.push(row);
    hash = crypto.createHash('sha256').update(hash).digest('hex');
  }

  return layout;
}

function formatTowersDTO(game: ITowersGame): ITowersGameDTO {
  const config = TOWERS_CONFIG[game.difficulty];
  const rows = [];

  for (let r = 0; r < 9; r++) {
    const revealed = game.revealedRows.find((rv) => rv.rowIndex === r);
    if (revealed) {
      rows.push({
        rowIndex: r,
        tiles: revealed.tiles,
        selectedTileIndex: revealed.selectedTileIndex,
      });
    } else if (game.status !== 'IN_PROGRESS') {
      // Board revealed at end of game
      rows.push({
        rowIndex: r,
        tiles: game.fullLayout[r],
      });
    } else {
      // Hidden row
      rows.push({
        rowIndex: r,
        tiles: Array(config.tilesPerRow).fill('HIDDEN' as TowersTileType),
      });
    }
  }

  return {
    id: game._id.toString(),
    userId: game.userId.toString(),
    username: game.username,
    difficulty: game.difficulty,
    betAmount: game.betAmount,
    currentRow: game.currentRow,
    currentMultiplier: game.currentMultiplier,
    status: game.status,
    payoutAmount: game.payoutAmount,
    rows,
    hash: game.hash,
    serverSeed: game.status !== 'IN_PROGRESS' ? game.serverSeed : undefined,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
}

/**
 * POST /api/towers/start
 */
export const startTowersGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { difficulty = 'EASY', betAmount } = req.body;
    const parsedBet = Number(betAmount);

    if (!TOWERS_CONFIG[difficulty as TowersDifficulty]) {
      res.status(400).json({ success: false, message: 'Invalid difficulty. Choose EASY, MEDIUM, HARD, EXTREME, or NIGHTMARE.' });
      return;
    }

    if (isNaN(parsedBet) || parsedBet < 0.5) {
      res.status(400).json({ success: false, message: 'Minimum bet is 0.5 ETB.' });
      return;
    }

    // Check active game
    const existing = await TowersGame.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (existing) {
      res.status(400).json({
        success: false,
        message: 'You already have an active Towers game in progress.',
        game: formatTowersDTO(existing),
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
    const fullLayout = generateTowersLayout(difficulty as TowersDifficulty, serverSeed);

    const game = await TowersGame.create({
      userId: new mongoose.Types.ObjectId(userId),
      username: user?.username || 'Climber',
      difficulty: difficulty as TowersDifficulty,
      betAmount: parsedBet,
      currentRow: 0,
      currentMultiplier: 1.0,
      status: 'IN_PROGRESS',
      payoutAmount: 0,
      fullLayout,
      revealedRows: [],
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
      description: `Towers Game Entry (${difficulty} ${parsedBet} ETB)`,
      referenceId: game._id.toString(),
      metadata: {
        gameType: 'TOWERS',
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
          description: `House Stake from ${user?.username} (Towers #${game._id})`,
          referenceId: game._id.toString(),
        });
      }
    }

    res.status(201).json({
      success: true,
      game: formatTowersDTO(game),
      newBalance: userWallet.availableBalance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/towers/step
 */
export const stepTowersGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { gameId, tileIndex } = req.body;
    const parsedTile = Number(tileIndex);

    const game = await TowersGame.findOne({
      _id: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) {
      res.status(404).json({ success: false, message: 'Active game not found.' });
      return;
    }

    const config = TOWERS_CONFIG[game.difficulty];
    if (isNaN(parsedTile) || parsedTile < 0 || parsedTile >= config.tilesPerRow) {
      res.status(400).json({ success: false, message: `Invalid tile index (0 to ${config.tilesPerRow - 1}).` });
      return;
    }

    const currentRowLayout = game.fullLayout[game.currentRow];
    const pickedTileType = currentRowLayout[parsedTile];

    // Reveal this row's full state
    game.revealedRows.push({
      rowIndex: game.currentRow,
      tiles: currentRowLayout,
      selectedTileIndex: parsedTile,
    });

    if (pickedTileType === 'SKULL') {
      // BUSTED
      game.status = 'BUSTED';
      game.payoutAmount = 0;
      await game.save();

      res.status(200).json({
        success: true,
        game: formatTowersDTO(game),
        outcome: 'BUSTED',
      });
      return;
    }

    // SAFE GEM!
    const newMultiplier = config.multipliers[game.currentRow];
    game.currentMultiplier = newMultiplier;

    if (game.currentRow === 8) {
      // COMPLETED TOP OF TOWER! Auto-cashout
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
          description: `Towers Top Floor Win (${game.difficulty} ${newMultiplier}x)`,
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
              description: `House Towers Payout to ${game.username}`,
              referenceId: game._id.toString(),
            });
          }
        }

        res.status(200).json({
          success: true,
          game: formatTowersDTO(game),
          outcome: 'TOP_FLOOR_WIN',
          newBalance: userWallet.availableBalance,
        });
        return;
      }
    } else {
      game.currentRow += 1;
      await game.save();

      res.status(200).json({
        success: true,
        game: formatTowersDTO(game),
        outcome: 'SAFE',
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/towers/cashout
 */
export const cashoutTowersGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { gameId } = req.body;

    const game = await TowersGame.findOne({
      _id: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) {
      res.status(404).json({ success: false, message: 'Active game not found.' });
      return;
    }

    if (game.currentMultiplier <= 1.0) {
      res.status(400).json({ success: false, message: 'You must climb at least one floor before cashing out.' });
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
        description: `Towers Cashout (${game.difficulty} ${game.currentMultiplier}x, Row #${game.currentRow})`,
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
            description: `House Towers Payout to ${game.username}`,
            referenceId: game._id.toString(),
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      game: formatTowersDTO(game),
      newBalance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/towers/active
 */
export const getActiveTowersGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(200).json({ success: true, game: null });
      return;
    }

    const game = await TowersGame.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    res.status(200).json({
      success: true,
      game: game ? formatTowersDTO(game) : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/towers/my-history
 */
export const getMyTowersHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Number(req.query.limit) || 20;
    const history = await TowersGame.find({
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
        reachedRow: g.currentRow,
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
