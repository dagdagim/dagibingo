import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { ChickenRoadGame } from '../../models/ChickenRoadGame';
import { User } from '../../models/User';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import {
  ChickenRoadDifficulty,
  ChickenRoadTileType,
  IChickenRoadDifficultyConfig,
  IChickenRoadGameDTO,
} from '../../shared';

const CHICKEN_ROAD_DIFFICULTY_DATA: Record<ChickenRoadDifficulty, IChickenRoadDifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Easy (3 Safe / 1 Car)',
    tilesPerRow: 4,
    safePerRow: 3,
    carsPerRow: 1,
    multipliers: [1.29, 1.72, 2.29, 3.06, 4.08, 5.44, 7.25, 9.67, 12.89, 17.18],
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'Medium (2 Safe / 1 Car)',
    tilesPerRow: 3,
    safePerRow: 2,
    carsPerRow: 1,
    multipliers: [1.45, 2.18, 3.27, 4.91, 7.36, 11.04, 16.56, 24.84, 37.26, 55.89],
  },
  HARD: {
    name: 'HARD',
    label: 'Hard (1 Safe / 1 Car)',
    tilesPerRow: 2,
    safePerRow: 1,
    carsPerRow: 1,
    multipliers: [1.94, 3.88, 7.76, 15.52, 31.04, 62.08, 124.16, 248.32, 496.64, 993.28],
  },
  EXTREME: {
    name: 'EXTREME',
    label: 'Extreme (1 Safe / 2 Cars)',
    tilesPerRow: 3,
    safePerRow: 1,
    carsPerRow: 2,
    multipliers: [2.91, 8.73, 26.19, 78.57, 235.71, 707.13, 2121.39, 6364.17, 19092.51, 57277.53],
  },
  NIGHTMARE: {
    name: 'NIGHTMARE',
    label: 'Nightmare (1 Safe / 3 Cars)',
    tilesPerRow: 4,
    safePerRow: 1,
    carsPerRow: 3,
    multipliers: [3.88, 15.52, 62.08, 248.32, 993.28, 3973.12, 15892.48, 63569.92, 254279.68, 1017118.72],
  },
};

const generateChickenRoadLayout = (difficulty: ChickenRoadDifficulty): ChickenRoadTileType[][] => {
  const config = CHICKEN_ROAD_DIFFICULTY_DATA[difficulty];
  const layout: ChickenRoadTileType[][] = [];

  for (let row = 0; row < 10; row++) { // 10 rows (lanes)
    const rowTiles: ChickenRoadTileType[] = [];
    for (let i = 0; i < config.safePerRow; i++) rowTiles.push('SAFE');
    for (let i = 0; i < config.carsPerRow; i++) rowTiles.push('CAR');

    // Shuffle row
    for (let i = rowTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rowTiles[i], rowTiles[j]] = [rowTiles[j], rowTiles[i]];
    }
    layout.push(rowTiles);
  }

  return layout;
};

const generateHash = (serverSeed: string, clientSeed: string, nonce: number): string => {
  return crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}-${nonce}`)
    .digest('hex');
};

const mapGameToDTO = (game: any): IChickenRoadGameDTO => {
  const isFinished = game.status !== 'IN_PROGRESS';

  let rowsToReturn = game.revealedRows;
  if (isFinished) {
    const revealedIndices = new Set(game.revealedRows.map((r: any) => r.rowIndex));
    const allRows = [...game.revealedRows];

    for (let i = 0; i < game.fullLayout.length; i++) {
      if (!revealedIndices.has(i)) {
        allRows.push({
          rowIndex: i,
          tiles: game.fullLayout[i],
        });
      }
    }
    allRows.sort((a, b) => a.rowIndex - b.rowIndex);
    rowsToReturn = allRows;
  } else {
    // Inject the current unknown row so UI can render the interactive tiles
    rowsToReturn = [...game.revealedRows];
    if (game.currentRow < game.fullLayout.length && game.fullLayout[game.currentRow]) {
      rowsToReturn.push({
        rowIndex: game.currentRow,
        tiles: Array(game.fullLayout[game.currentRow].length).fill('HIDDEN'),
      });
    }
    rowsToReturn.sort((a: any, b: any) => a.rowIndex - b.rowIndex);
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
    rows: rowsToReturn,
    hash: game.hash,
    serverSeed: isFinished ? game.serverSeed : undefined,
    clientSeed: game.clientSeed,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
  };
};

export const startChickenRoadGame = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { difficulty, betAmount } = req.body;
    const userId = req.user!.userId;

    const diffLevel = difficulty as ChickenRoadDifficulty;

    if (!CHICKEN_ROAD_DIFFICULTY_DATA[diffLevel]) {
      throw new BadRequestError('Invalid difficulty level.');
    }

    if (betAmount < 0.5) {
      throw new BadRequestError('Minimum bet is 0.5 ETB.');
    }

    const activeGame = await ChickenRoadGame.findOne({ userId: new mongoose.Types.ObjectId(userId), status: 'IN_PROGRESS' });
    if (activeGame) {
      throw new BadRequestError('You already have an active Chicken Road game. Cash out or finish it first.');
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found.');

    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!userWallet || userWallet.availableBalance < betAmount) {
      throw new BadRequestError(`Insufficient balance. You have ${userWallet?.availableBalance || 0} ETB.`);
    }

    // Debit
    const userBalBefore = userWallet.availableBalance;
    userWallet.availableBalance -= betAmount;
    await userWallet.save();

    await WalletTransaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      walletId: userWallet._id,
      type: 'GAME_ENTRY',
      amount: -betAmount,
      balanceBefore: userBalBefore,
      balanceAfter: userWallet.availableBalance,
      referenceId: new mongoose.Types.ObjectId().toString(),
      description: `Chicken Road Start: ${diffLevel}`,
      status: 'COMPLETED',
    });

    const fullLayout = generateChickenRoadLayout(diffLevel);
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const clientSeed = 'chickenroad_client_seed';
    const nonce = 1;
    const hash = generateHash(serverSeed, clientSeed, nonce);

    const game = new ChickenRoadGame({
      userId: new mongoose.Types.ObjectId(userId),
      username: user.username,
      difficulty: diffLevel,
      betAmount,
      currentRow: 0,
      currentMultiplier: 1.0,
      status: 'IN_PROGRESS',
      payoutAmount: 0,
      fullLayout,
      revealedRows: [],
      hash,
      serverSeed,
      clientSeed,
      nonce,
    });

    await game.save();

    res.status(201).json({
      game: mapGameToDTO(game),
      newBalance: userWallet.availableBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const stepChickenRoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gameId, tileIndex } = req.body;
    const userId = req.user!.userId;

    const game = await ChickenRoadGame.findById(gameId);
    if (!game) throw new NotFoundError('Game not found.');
    if (game.userId.toString() !== userId) throw new BadRequestError('Not your game.');
    if (game.status !== 'IN_PROGRESS') throw new BadRequestError('Game is already finished.');

    const config = CHICKEN_ROAD_DIFFICULTY_DATA[game.difficulty];
    const currentRowIndex = game.currentRow;

    if (currentRowIndex >= 10) {
      throw new BadRequestError('You have already crossed all lanes.');
    }

    const targetTileIndex = typeof tileIndex === 'number' && tileIndex >= 0 && tileIndex < config.tilesPerRow
      ? tileIndex
      : 0;

    const rowLayout = game.fullLayout[currentRowIndex];
    const pickedTile = rowLayout[targetTileIndex];

    game.revealedRows.push({
      rowIndex: currentRowIndex,
      tiles: rowLayout,
      selectedTileIndex: targetTileIndex,
    });

    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!userWallet) throw new NotFoundError('Wallet not found');

    if (pickedTile === 'CAR') {
      game.status = 'CRUSHED';
      game.payoutAmount = 0;
    } else {
      const nextMultiplier = config.multipliers[currentRowIndex];
      game.currentMultiplier = nextMultiplier;
      game.currentRow += 1;

      if (game.currentRow === 10) {
        // Reached end of the road
        game.status = 'CASHED_OUT';
        game.payoutAmount = game.betAmount * game.currentMultiplier;
        
        const balBefore = userWallet.availableBalance;
        userWallet.availableBalance += game.payoutAmount;
        await userWallet.save();

        await WalletTransaction.create({
          userId: new mongoose.Types.ObjectId(userId),
          walletId: userWallet._id,
          type: 'PRIZE',
          amount: game.payoutAmount,
          balanceBefore: balBefore,
          balanceAfter: userWallet.availableBalance,
          referenceId: game._id.toString(),
          description: `Chicken Road Win: ${game.currentMultiplier}x`,
          status: 'COMPLETED',
        });
      }
    }

    await game.save();

    res.json({
      game: mapGameToDTO(game),
      newBalance: userWallet.availableBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const cashoutChickenRoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gameId } = req.body;
    const userId = req.user!.userId;

    const game = await ChickenRoadGame.findById(gameId);
    if (!game) throw new NotFoundError('Game not found.');
    if (game.userId.toString() !== userId) throw new BadRequestError('Not your game.');
    if (game.status !== 'IN_PROGRESS') throw new BadRequestError('Game is already finished.');

    if (game.currentRow === 0) {
      throw new BadRequestError('Cannot cash out without taking at least one step.');
    }

    game.status = 'CASHED_OUT';
    game.payoutAmount = game.betAmount * game.currentMultiplier;

    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!userWallet) throw new NotFoundError('Wallet not found');

    const balBefore = userWallet.availableBalance;
    userWallet.availableBalance += game.payoutAmount;
    await userWallet.save();

    await WalletTransaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      walletId: userWallet._id,
      type: 'PRIZE',
      amount: game.payoutAmount,
      balanceBefore: balBefore,
      balanceAfter: userWallet.availableBalance,
      referenceId: game._id.toString(),
      description: `Chicken Road Cashout: ${game.currentMultiplier}x`,
      status: 'COMPLETED',
    });

    await game.save();

    res.json({
      game: mapGameToDTO(game),
      newBalance: userWallet.availableBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveChickenRoadGame = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const activeGame = await ChickenRoadGame.findOne({ userId: new mongoose.Types.ObjectId(userId), status: 'IN_PROGRESS' });

    res.json({
      game: activeGame ? mapGameToDTO(activeGame) : null,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyChickenRoadHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    const history = await ChickenRoadGame.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['CASHED_OUT', 'CRUSHED'] },
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      data: history.map((game) => ({
        id: game._id.toString(),
        difficulty: game.difficulty,
        betAmount: game.betAmount,
        reachedRow: game.currentRow,
        multiplier: game.currentMultiplier,
        payoutAmount: game.payoutAmount,
        status: game.status,
        createdAt: game.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
};
