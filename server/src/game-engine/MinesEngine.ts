import crypto from 'crypto';
import mongoose from 'mongoose';
import { MinesGame, IMinesGame } from '../models/MinesGame';
import { Wallet } from '../models/Wallet';
import { WalletTransaction } from '../models/WalletTransaction';
import { User } from '../models/User';
import { IMinesGameDTO, MinesHistoryItem, MinesStatsDTO } from '../shared';
import { logger } from '../utils/logger';

export class MinesEngine {
  private static instance: MinesEngine;

  private constructor() {}

  public static getInstance(): MinesEngine {
    if (!MinesEngine.instance) {
      MinesEngine.instance = new MinesEngine();
    }
    return MinesEngine.instance;
  }

  /**
   * Fair multiplier formula with 97% RTP (3% house edge)
   */
  public static calculateMultiplier(mineCount: number, gemsRevealed: number): number {
    if (gemsRevealed <= 0) return 1.0;
    const totalTiles = 25;
    const totalGems = totalTiles - mineCount;
    if (gemsRevealed > totalGems) return 0;

    let mult = 0.97;
    for (let i = 0; i < gemsRevealed; i++) {
      mult *= (totalTiles - i) / (totalGems - i);
    }

    return Math.max(1.01, Math.floor(mult * 100) / 100);
  }

  /**
   * Deterministic & provably fair grid layout generation
   */
  public static generateGrid(serverSeed: string, clientSeed: string, nonce: number, mineCount: number): boolean[] {
    const tiles = Array.from({ length: 25 }, (_, i) => i);
    const hash = crypto
      .createHmac('sha256', serverSeed)
      .update(`${clientSeed}:${nonce}`)
      .digest('hex');

    // Fisher-Yates shuffle seeded with byte chunks from HMAC
    let currentHash = hash;
    for (let i = tiles.length - 1; i > 0; i--) {
      if (currentHash.length < 8) {
        currentHash = crypto.createHash('sha256').update(currentHash).digest('hex');
      }
      const chunk = parseInt(currentHash.substring(0, 8), 16);
      currentHash = currentHash.substring(8);
      const j = chunk % (i + 1);
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    const mineIndices = new Set(tiles.slice(0, mineCount));
    return Array.from({ length: 25 }, (_, i) => mineIndices.has(i));
  }

  /**
   * Format Game DTO for safe client delivery (masks unrevealed mines while in progress)
   */
  private formatGameDTO(game: IMinesGame, revealAll: boolean = false): IMinesGameDTO {
    const isFinished = game.status !== 'IN_PROGRESS' || revealAll;
    const nextMult =
      game.status === 'IN_PROGRESS'
        ? MinesEngine.calculateMultiplier(game.mineCount, game.revealedTiles.length + 1)
        : game.currentMultiplier;

    return {
      id: game._id.toString(),
      userId: game.userId.toString(),
      betAmount: game.betAmount,
      mineCount: game.mineCount,
      revealedTiles: game.revealedTiles,
      currentMultiplier: game.currentMultiplier,
      nextMultiplier: nextMult,
      payoutAmount: game.payoutAmount,
      status: game.status,
      hash: game.hash,
      serverSeed: isFinished ? game.serverSeed : undefined,
      clientSeed: game.clientSeed,
      nonce: game.nonce,
      createdAt: game.createdAt.toISOString(),
      grid: isFinished ? game.grid : undefined,
    };
  }

  /**
   * Start a new Mines game session
   */
  public async startGame(userId: string, betAmount: number, mineCount: number, customClientSeed?: string): Promise<{ game: IMinesGameDTO; newBalance: number }> {
    if (!userId) {
      throw new Error('Authentication required.');
    }

    if (mineCount < 1 || mineCount > 24) {
      throw new Error('Mine count must be between 1 and 24.');
    }

    if (!betAmount || betAmount < 0.5) {
      throw new Error('Minimum bet is 0.5 ETB.');
    }

    // Check if user already has an ongoing active game
    const activeGame = await MinesGame.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (activeGame) {
      const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      return {
        game: this.formatGameDTO(activeGame),
        newBalance: userWallet?.availableBalance || 0,
      };
    }

    // Deduct player wallet
    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!userWallet || userWallet.availableBalance < betAmount) {
      throw new Error(`Insufficient wallet balance. You have ${userWallet?.availableBalance || 0} ETB.`);
    }

    const userBalBefore = userWallet.availableBalance;
    userWallet.availableBalance -= betAmount;
    await userWallet.save();

    // Generate cryptographic seeds
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const clientSeed = customClientSeed || crypto.randomBytes(16).toString('hex');
    const totalUserGames = await MinesGame.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });
    const nonce = totalUserGames + 1;

    const hash = crypto
      .createHash('sha256')
      .update(`${serverSeed}:${clientSeed}:${nonce}`)
      .digest('hex');

    const grid = MinesEngine.generateGrid(serverSeed, clientSeed, nonce, mineCount);

    const game = await MinesGame.create({
      userId: new mongoose.Types.ObjectId(userId),
      betAmount,
      mineCount,
      grid,
      revealedTiles: [],
      currentMultiplier: 1.0,
      payoutAmount: 0,
      status: 'IN_PROGRESS',
      serverSeed,
      clientSeed,
      hash,
      nonce,
    });

    // Record Player Deduction Transaction
    await WalletTransaction.create({
      walletId: userWallet._id,
      userId: new mongoose.Types.ObjectId(userId),
      type: 'GAME_ENTRY',
      amount: betAmount,
      balanceBefore: userBalBefore,
      balanceAfter: userWallet.availableBalance,
      currency: 'ETB',
      status: 'COMPLETED',
      description: `Mines Bet (${mineCount} Mines, Bet ${betAmount} ETB)`,
      referenceId: game._id.toString(),
      metadata: {
        gameType: 'MINES',
        gameId: game._id.toString(),
        mineCount,
      },
    });

    // Credit Admin / House Wallet
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (adminUser) {
      const adminWallet = await Wallet.findOne({ userId: adminUser._id });
      if (adminWallet) {
        const adminBalBefore = adminWallet.availableBalance;
        adminWallet.availableBalance += betAmount;
        await adminWallet.save();

        await WalletTransaction.create({
          walletId: adminWallet._id,
          userId: adminUser._id,
          type: 'DEPOSIT',
          amount: betAmount,
          balanceBefore: adminBalBefore,
          balanceAfter: adminWallet.availableBalance,
          currency: 'ETB',
          status: 'COMPLETED',
          description: `House Stake from Mines Game (Bet ${betAmount} ETB, ${mineCount} Mines)`,
          referenceId: game._id.toString(),
          metadata: {
            gameType: 'MINES',
            gameId: game._id.toString(),
            playerUserId: userId,
          },
        });
      }
    }

    return {
      game: this.formatGameDTO(game),
      newBalance: userWallet.availableBalance,
    };
  }

  /**
   * Reveal a tile on the 5x5 grid
   */
  public async revealTile(userId: string, gameId: string, tileIndex: number): Promise<{ game: IMinesGameDTO; isMine: boolean; newBalance?: number }> {
    if (tileIndex < 0 || tileIndex > 24) {
      throw new Error('Tile index must be between 0 and 24.');
    }

    const game = await MinesGame.findOne({
      _id: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) {
      throw new Error('Active game not found or already finished.');
    }

    if (game.revealedTiles.includes(tileIndex)) {
      throw new Error('Tile has already been revealed.');
    }

    const isMine = game.grid[tileIndex];

    if (isMine) {
      // Hit a bomb -> Explode and lose
      game.status = 'EXPLODED';
      game.payoutAmount = 0;
      game.revealedTiles.push(tileIndex);
      await game.save();

      return {
        game: this.formatGameDTO(game, true),
        isMine: true,
      };
    }

    // Safe Gem revealed!
    game.revealedTiles.push(tileIndex);
    const gemsCount = game.revealedTiles.length;
    const mult = MinesEngine.calculateMultiplier(game.mineCount, gemsCount);
    game.currentMultiplier = mult;
    game.payoutAmount = Math.floor(game.betAmount * mult * 100) / 100;

    const totalSafeGems = 25 - game.mineCount;
    let newBalance: number | undefined;

    // If all safe gems revealed -> Auto jackpot cashout!
    if (gemsCount >= totalSafeGems) {
      game.status = 'CASHED_OUT';
      await game.save();

      // Credit Player Wallet
      const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
      if (userWallet) {
        const userBalBefore = userWallet.availableBalance;
        userWallet.availableBalance += game.payoutAmount;
        await userWallet.save();
        newBalance = userWallet.availableBalance;

        await WalletTransaction.create({
          walletId: userWallet._id,
          userId: new mongoose.Types.ObjectId(userId),
          type: 'PRIZE',
          amount: game.payoutAmount,
          balanceBefore: userBalBefore,
          balanceAfter: userWallet.availableBalance,
          currency: 'ETB',
          status: 'COMPLETED',
          description: `Mines Grand Jackpot! Cleared all ${totalSafeGems} gems (${mult}x)`,
          referenceId: game._id.toString(),
          metadata: {
            gameType: 'MINES',
            gameId: game._id.toString(),
            multiplier: mult,
            gemsCount,
          },
        });
      }

      // Debit Admin Wallet
      const adminUser = await User.findOne({ role: 'ADMIN' });
      if (adminUser) {
        const adminWallet = await Wallet.findOne({ userId: adminUser._id });
        if (adminWallet) {
          const adminBalBefore = adminWallet.availableBalance;
          adminWallet.availableBalance -= game.payoutAmount;
          await adminWallet.save();

          await WalletTransaction.create({
            walletId: adminWallet._id,
            userId: adminUser._id,
            type: 'WITHDRAWAL',
            amount: game.payoutAmount,
            balanceBefore: adminBalBefore,
            balanceAfter: adminWallet.availableBalance,
            currency: 'ETB',
            status: 'COMPLETED',
            description: `House Mines Payout (Cleared ${totalSafeGems} gems, ${mult}x)`,
            referenceId: game._id.toString(),
          });
        }
      }

      return {
        game: this.formatGameDTO(game, true),
        isMine: false,
        newBalance,
      };
    }

    await game.save();

    return {
      game: this.formatGameDTO(game),
      isMine: false,
    };
  }

  /**
   * Cash Out active game and claim winnings
   */
  public async cashout(userId: string, gameId: string): Promise<{ game: IMinesGameDTO; payoutAmount: number; newBalance: number }> {
    const game = await MinesGame.findOne({
      _id: new mongoose.Types.ObjectId(gameId),
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) {
      throw new Error('Active game not found or already finished.');
    }

    if (game.revealedTiles.length === 0) {
      throw new Error('You must reveal at least one diamond before cashing out.');
    }

    const mult = MinesEngine.calculateMultiplier(game.mineCount, game.revealedTiles.length);
    const payoutAmount = Math.floor(game.betAmount * mult * 100) / 100;

    game.status = 'CASHED_OUT';
    game.currentMultiplier = mult;
    game.payoutAmount = payoutAmount;
    await game.save();

    // Credit Player Wallet
    const userWallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    let newBalance = 0;
    if (userWallet) {
      const userBalBefore = userWallet.availableBalance;
      userWallet.availableBalance += payoutAmount;
      await userWallet.save();
      newBalance = userWallet.availableBalance;

      await WalletTransaction.create({
        walletId: userWallet._id,
        userId: new mongoose.Types.ObjectId(userId),
        type: 'PRIZE',
        amount: payoutAmount,
        balanceBefore: userBalBefore,
        balanceAfter: userWallet.availableBalance,
        currency: 'ETB',
        status: 'COMPLETED',
        description: `Mines Win (${game.revealedTiles.length} Diamonds, ${mult}x Multiplier)`,
        referenceId: game._id.toString(),
        metadata: {
          gameType: 'MINES',
          gameId: game._id.toString(),
          multiplier: mult,
          gemsRevealed: game.revealedTiles.length,
          mineCount: game.mineCount,
        },
      });
    }

    // Debit Admin / House Wallet
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
          description: `House Mines Payout (${game.revealedTiles.length} Diamonds, ${mult}x)`,
          referenceId: game._id.toString(),
          metadata: {
            gameType: 'MINES',
            gameId: game._id.toString(),
            playerUserId: userId,
            multiplier: mult,
          },
        });
      }
    }

    return {
      game: this.formatGameDTO(game, true),
      payoutAmount,
      newBalance,
    };
  }

  /**
   * Get ongoing active game for user
   */
  public async getActiveGame(userId: string): Promise<IMinesGameDTO | null> {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return null;

    const game = await MinesGame.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!game) return null;
    return this.formatGameDTO(game);
  }

  /**
   * Get user's personal Mines history
   */
  public async getMyHistory(userId: string, limit: number = 20): Promise<MinesHistoryItem[]> {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return [];

    const games = await MinesGame.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['CASHED_OUT', 'EXPLODED'] },
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));

    return games.map((g) => ({
      id: g._id.toString(),
      betAmount: g.betAmount,
      mineCount: g.mineCount,
      revealedCount: g.revealedTiles.length,
      multiplier: g.currentMultiplier,
      payoutAmount: g.payoutAmount,
      status: g.status,
      createdAt: g.createdAt.toISOString(),
    }));
  }

  /**
   * Get aggregate platform statistics for Mines
   */
  public async getStats(): Promise<MinesStatsDTO> {
    try {
      const totalGames = await MinesGame.countDocuments({ status: { $in: ['CASHED_OUT', 'EXPLODED'] } });
      const totalWon = await MinesGame.countDocuments({ status: 'CASHED_OUT' });

      const topWin = await MinesGame.findOne({ status: 'CASHED_OUT' }).sort({ payoutAmount: -1 });
      const topMult = await MinesGame.findOne({ status: 'CASHED_OUT' }).sort({ currentMultiplier: -1 });

      return {
        totalGames,
        totalWon,
        highestMultiplier: topMult?.currentMultiplier || 1.0,
        highestPayout: topWin?.payoutAmount || 0,
      };
    } catch (err) {
      logger.error('Error fetching Mines stats:', err);
      return { totalGames: 0, totalWon: 0, highestMultiplier: 1.0, highestPayout: 0 };
    }
  }
}
