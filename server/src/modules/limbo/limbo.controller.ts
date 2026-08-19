import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { LimboBet } from '../../models/LimboBet';
import { Wallet } from '../../models/Wallet';
import { WalletTransaction } from '../../models/WalletTransaction';
import { User } from '../../models/User';
import { ILimboBetDTO, LimboStatsDTO } from '../../shared';

/**
 * Provably Fair Limbo Multiplier Generator (98% RTP)
 */
function generateLimboMultiplier(serverSeed: string, clientSeed: string, nonce: number): number {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hash = hmac.digest('hex');

  // Convert first 8 hex characters (32 bits) into a fraction
  const intVal = parseInt(hash.substring(0, 8), 16);
  const uniform = intVal / 0x100000000; // in [0, 1)

  // 98% RTP formula
  // If uniform is extremely close to 1, cap to prevent division by zero
  const floatVal = Math.max(0.0000001, 1 - uniform);
  const rawMultiplier = 98 / (floatVal * 100);

  // Return formatted multiplier capped at 1,000,000x with 2 decimal places
  const finalMultiplier = Math.min(1000000, Math.max(1.0, Math.floor(rawMultiplier * 100) / 100));
  return finalMultiplier;
}

/**
 * POST /api/limbo/bet
 */
export const placeLimboBet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { betAmount, targetMultiplier, clientSeed = 'dagi_limbo_client_seed' } = req.body;

    const parsedBet = Number(betAmount);
    const parsedTarget = Number(targetMultiplier);

    if (isNaN(parsedBet) || parsedBet < 0.5) {
      res.status(400).json({ success: false, message: 'Minimum bet is 0.5 ETB.' });
      return;
    }

    if (isNaN(parsedTarget) || parsedTarget < 1.01 || parsedTarget > 1000000) {
      res.status(400).json({ success: false, message: 'Target multiplier must be between 1.01x and 1,000,000x.' });
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

    // User's total nonce for provably fair
    const previousBetsCount = await LimboBet.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });
    const nonce = previousBetsCount + 1;

    const serverSeed = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    const resultMultiplier = generateLimboMultiplier(serverSeed, clientSeed, nonce);
    const isWon = resultMultiplier >= parsedTarget;
    const winChance = Math.floor((98 / parsedTarget) * 100) / 100;
    const payoutAmount = isWon ? Math.floor(parsedBet * parsedTarget * 100) / 100 : 0;

    const bet = await LimboBet.create({
      userId: new mongoose.Types.ObjectId(userId),
      username: user?.username || 'LimboRoller',
      betAmount: parsedBet,
      targetMultiplier: parsedTarget,
      resultMultiplier,
      winChance,
      payoutAmount,
      status: isWon ? 'WON' : 'LOST',
      hash,
      serverSeed,
      clientSeed,
      nonce,
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
      description: `Limbo Bet Entry (Target ${parsedTarget}x, ${parsedBet} ETB)`,
      referenceId: bet._id.toString(),
      metadata: {
        gameType: 'LIMBO',
        targetMultiplier: parsedTarget,
        resultMultiplier,
      },
    });

    // Credit house admin for the stake
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
          description: `House Limbo Stake from ${user?.username}`,
          referenceId: bet._id.toString(),
        });
      }
    }

    // Settle Winnings if Won
    let finalBalance = userWallet.availableBalance;
    if (isWon) {
      const balBeforePayout = userWallet.availableBalance;
      userWallet.availableBalance += payoutAmount;
      await userWallet.save();
      finalBalance = userWallet.availableBalance;

      await WalletTransaction.create({
        walletId: userWallet._id,
        userId: new mongoose.Types.ObjectId(userId),
        type: 'PRIZE',
        amount: payoutAmount,
        balanceBefore: balBeforePayout,
        balanceAfter: userWallet.availableBalance,
        currency: 'ETB',
        status: 'COMPLETED',
        description: `Limbo Win Payout (Target ${parsedTarget}x, Result ${resultMultiplier}x)`,
        referenceId: bet._id.toString(),
      });

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
            description: `House Limbo Payout to ${user?.username}`,
            referenceId: bet._id.toString(),
          });
        }
      }
    }

    const betDTO: ILimboBetDTO = {
      id: bet._id.toString(),
      userId: bet.userId.toString(),
      username: bet.username,
      betAmount: bet.betAmount,
      targetMultiplier: bet.targetMultiplier,
      resultMultiplier: bet.resultMultiplier,
      winChance: bet.winChance,
      payoutAmount: bet.payoutAmount,
      status: bet.status,
      hash: bet.hash,
      serverSeed: bet.serverSeed,
      clientSeed: bet.clientSeed,
      nonce: bet.nonce,
      createdAt: bet.createdAt.toISOString(),
    };

    res.status(201).json({
      success: true,
      bet: betDTO,
      newBalance: finalBalance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/limbo/my-history
 */
export const getMyLimboHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Number(req.query.limit) || 25;
    const history = await LimboBet.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100));

    res.status(200).json({
      success: true,
      data: history.map((b) => ({
        id: b._id.toString(),
        userId: b.userId.toString(),
        username: b.username,
        betAmount: b.betAmount,
        targetMultiplier: b.targetMultiplier,
        resultMultiplier: b.resultMultiplier,
        winChance: b.winChance,
        payoutAmount: b.payoutAmount,
        status: b.status,
        hash: b.hash,
        serverSeed: b.serverSeed,
        clientSeed: b.clientSeed,
        nonce: b.nonce,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/limbo/stats
 */
export const getLimboStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const totalBets = await LimboBet.countDocuments();
    const totalWon = await LimboBet.countDocuments({ status: 'WON' });
    const topMulti = await LimboBet.findOne().sort({ resultMultiplier: -1 });
    const topWin = await LimboBet.findOne({ status: 'WON' }).sort({ payoutAmount: -1 });

    const recent = await LimboBet.find()
      .sort({ createdAt: -1 })
      .limit(10);

    const stats: LimboStatsDTO = {
      totalBets,
      totalWon,
      highestMultiplier: topMulti?.resultMultiplier || 1.0,
      highestPayout: topWin?.payoutAmount || 0,
      recentBets: recent.map((b) => ({
        id: b._id.toString(),
        username: b.username,
        targetMultiplier: b.targetMultiplier,
        resultMultiplier: b.resultMultiplier,
        payoutAmount: b.payoutAmount,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      })),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
