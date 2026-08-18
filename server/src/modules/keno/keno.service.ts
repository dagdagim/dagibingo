import mongoose from 'mongoose';
import { KenoBet, IKenoBet } from '../../models/KenoBet';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';
import { BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import {
  KenoPlayInput,
  KenoPlayResult,
  KenoHistoryItem,
  KenoStats,
  KENO_PAYTABLE,
} from '../../shared';

export class KenoService {
  /**
   * Generates 20 unique random numbers between 1 and 80
   */
  public generateKenoDraw(): number[] {
    const numbers: number[] = Array.from({ length: 80 }, (_, i) => i + 1);
    // Fisher-Yates Shuffle
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers.slice(0, 20).sort((a, b) => a - b);
  }

  /**
   * Evaluates Keno multiplier based on spots selected and matches hit
   */
  public calculateMultiplier(spotsCount: number, matchesCount: number): number {
    const paytable = KENO_PAYTABLE[spotsCount];
    if (!paytable) return 0;
    return paytable[matchesCount] || 0;
  }

  /**
   * Executes a Keno instant draw game
   */
  public async playKeno(userId: string, input: KenoPlayInput): Promise<KenoPlayResult> {
    const spots = Array.from(new Set(input.spots)).filter((n) => n >= 1 && n <= 80);
    if (spots.length < 1 || spots.length > 10) {
      throw new BadRequestError('You must select between 1 and 10 numbers (1–80)');
    }

    const wager = Number(input.wager);
    if (isNaN(wager) || wager < 1) {
      throw new BadRequestError('Minimum wager is 1 ETB');
    }

    // 1. Fetch & Verify Wallet Balance
    let wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: new mongoose.Types.ObjectId(userId),
        availableBalance: 1000,
        lockedBalance: 0,
        bonusBalance: 0,
        currency: 'ETB',
      });
    }

    if (wallet.availableBalance < wager) {
      throw new BadRequestError(
        `Insufficient balance (${wallet.availableBalance.toLocaleString()} ETB available). Please deposit funds or lower your wager.`
      );
    }

    // 2. Deduct Wager from Available Balance
    const balanceBeforeWager = wallet.availableBalance;
    wallet.availableBalance -= wager;
    await wallet.save();

    await WalletTransaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      walletId: wallet._id,
      type: 'GAME_ENTRY',
      amount: -wager,
      balanceBefore: balanceBeforeWager,
      balanceAfter: wallet.availableBalance,
      currency: wallet.currency,
      status: 'COMPLETED',
      description: `Keno Bet Entry (${spots.length} Spots, Wager: ${wager} ETB)`,
      metadata: {
        gameType: 'KENO',
        spots,
        spotsCount: spots.length,
        wager,
      },
    });

    // 3. Draw 20 Numbers & Match
    const drawnNumbers = this.generateKenoDraw();
    const matchedNumbers = spots.filter((num) => drawnNumbers.includes(num));
    const matchesCount = matchedNumbers.length;

    // 4. Calculate Payout & Multiplier
    const multiplier = this.calculateMultiplier(spots.length, matchesCount);
    const payout = Math.floor(wager * multiplier);
    const isWin = payout > 0;

    // 5. Credit Payout if Won
    if (isWin) {
      const balanceBeforeWin = wallet.availableBalance;
      wallet.availableBalance += payout;
      await wallet.save();

      await WalletTransaction.create({
        userId: new mongoose.Types.ObjectId(userId),
        walletId: wallet._id,
        type: 'PRIZE',
        amount: payout,
        balanceBefore: balanceBeforeWin,
        balanceAfter: wallet.availableBalance,
        currency: wallet.currency,
        status: 'COMPLETED',
        description: `🎉 Keno Payout: ${matchesCount}/${spots.length} Hits (${multiplier}x Multiplier)`,
        metadata: {
          gameType: 'KENO',
          spots,
          drawnNumbers,
          matchedNumbers,
          matchesCount,
          multiplier,
          payout,
        },
      });

      if (payout >= 100) {
        await Notification.create({
          userId: new mongoose.Types.ObjectId(userId),
          type: 'GAME_WIN',
          title: '🔥 KENO BIG WIN!',
          message: `Congratulations! You matched ${matchesCount}/${spots.length} spots on Keno and won ${payout.toLocaleString()} ETB (${multiplier}x)!`,
        });
      }
    }

    // 6. Update User Game Statistics
    const user = await User.findById(userId);
    if (user) {
      user.stats.gamesPlayed += 1;
      if (isWin) {
        user.stats.gamesWon += 1;
        user.stats.totalWinnings += payout;
        user.stats.highestWin = Math.max(user.stats.highestWin, payout);
        user.stats.currentStreak += 1;
        user.stats.bestStreak = Math.max(user.stats.bestStreak, user.stats.currentStreak);
      } else {
        user.stats.currentStreak = 0;
      }
      user.stats.winRate = Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100);
      await user.save();
    }

    // 7. Save Keno Bet Record
    const bet = await KenoBet.create({
      userId: new mongoose.Types.ObjectId(userId),
      spots,
      drawnNumbers,
      matchedNumbers,
      matchesCount,
      wager,
      multiplier,
      payout,
      isWin,
      status: 'COMPLETED',
    });

    logger.info(
      `[Keno] User ${userId} played ${spots.length} spots (Wager: ${wager} ETB) -> Matched ${matchesCount} (Won: ${payout} ETB)`
    );

    return {
      betId: bet._id.toString(),
      spots,
      drawnNumbers,
      matchedNumbers,
      matchesCount,
      wager,
      multiplier,
      payout,
      isWin,
      balance: {
        availableBalance: wallet.availableBalance,
        lockedBalance: wallet.lockedBalance,
        bonusBalance: wallet.bonusBalance,
        totalBalance: wallet.availableBalance + wallet.lockedBalance + wallet.bonusBalance,
      },
      createdAt: bet.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves player's recent Keno history
   */
  public async getUserHistory(userId: string, limit = 20): Promise<KenoHistoryItem[]> {
    const bets = await KenoBet.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit);

    return bets.map((b) => ({
      id: b._id.toString(),
      spots: b.spots,
      drawnNumbers: b.drawnNumbers,
      matchedNumbers: b.matchedNumbers,
      matchesCount: b.matchesCount,
      wager: b.wager,
      multiplier: b.multiplier,
      payout: b.payout,
      isWin: b.isWin,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  /**
   * Computes hot/cold statistics across the last 100 draws
   */
  public async getKenoStats(): Promise<KenoStats> {
    const recentBets = await KenoBet.find({}).sort({ createdAt: -1 }).limit(100);

    const counts: Record<number, number> = {};
    for (let i = 1; i <= 80; i++) counts[i] = 0;

    recentBets.forEach((bet) => {
      bet.drawnNumbers.forEach((num) => {
        counts[num] = (counts[num] || 0) + 1;
      });
    });

    const frequencyList = Object.entries(counts).map(([num, count]) => ({
      number: Number(num),
      count,
    }));

    frequencyList.sort((a, b) => b.count - a.count);
    const hotNumbers = frequencyList.slice(0, 10);
    const coldNumbers = [...frequencyList].reverse().slice(0, 10);

    return {
      totalRounds: recentBets.length,
      hotNumbers,
      coldNumbers,
    };
  }
}
