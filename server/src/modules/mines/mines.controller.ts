import { Request, Response, NextFunction } from 'express';
import { MinesEngine } from '../../game-engine/MinesEngine';

const minesEngine = MinesEngine.getInstance();

export const startMinesGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { betAmount, mineCount, clientSeed } = req.body;

    const parsedBet = Number(betAmount);
    const parsedMines = Number(mineCount);

    if (isNaN(parsedBet) || parsedBet < 0.5) {
      res.status(400).json({ success: false, message: 'Minimum bet is 0.5 ETB.' });
      return;
    }

    if (isNaN(parsedMines) || parsedMines < 1 || parsedMines > 24) {
      res.status(400).json({ success: false, message: 'Mines must be between 1 and 24.' });
      return;
    }

    const result = await minesEngine.startGame(userId, parsedBet, parsedMines, clientSeed);

    res.status(201).json({
      success: true,
      game: result.game,
      newBalance: result.newBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const revealMinesTile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { gameId, tileIndex } = req.body;

    if (!gameId) {
      res.status(400).json({ success: false, message: 'Game ID is required.' });
      return;
    }

    const parsedIndex = Number(tileIndex);
    if (isNaN(parsedIndex) || parsedIndex < 0 || parsedIndex > 24) {
      res.status(400).json({ success: false, message: 'Tile index must be between 0 and 24.' });
      return;
    }

    const result = await minesEngine.revealTile(userId, gameId, parsedIndex);

    res.status(200).json({
      success: true,
      game: result.game,
      isMine: result.isMine,
      newBalance: result.newBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const cashoutMinesGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { gameId } = req.body;
    if (!gameId) {
      res.status(400).json({ success: false, message: 'Game ID is required.' });
      return;
    }

    const result = await minesEngine.cashout(userId, gameId);

    res.status(200).json({
      success: true,
      game: result.game,
      payoutAmount: result.payoutAmount,
      newBalance: result.newBalance,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveMinesGame = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(200).json({ success: true, game: null });
      return;
    }

    const game = await minesEngine.getActiveGame(userId);

    res.status(200).json({
      success: true,
      game,
    });
  } catch (error) {
    next(error);
  }
};

export const getMinesHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const limit = Number(req.query.limit) || 20;
    const history = await minesEngine.getMyHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

export const getMinesStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await minesEngine.getStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
