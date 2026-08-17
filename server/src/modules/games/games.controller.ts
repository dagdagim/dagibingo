import { Request, Response, NextFunction } from 'express';
import { GamesService } from './games.service';
import { GameEngine } from '../../game-engine/GameEngine';
import { GameCategory } from '@bingo/shared';

const gamesService = new GamesService();
const gameEngine = GameEngine.getInstance();

export class GamesController {
  public static async listGames(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = req.query.category as GameCategory | undefined;
      const games = await gamesService.listGames(category);
      res.status(200).json({ success: true, data: games });
    } catch (error) {
      next(error);
    }
  }

  public static async getGameDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const game = await gamesService.getGameDetails(id);
      res.status(200).json({ success: true, data: game });
    } catch (error) {
      next(error);
    }
  }

  public static async joinGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const ticketsCount = req.body.ticketsCount ? parseInt(req.body.ticketsCount, 10) : 1;
      const result = await gamesService.joinGame(userId, id, ticketsCount);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const tickets = await gamesService.getPlayerTickets(userId, id);
      res.status(200).json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  }

  public static async claimBingo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { ticketId } = req.body;
      const result = await gameEngine.claimBingo(id, userId, ticketId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async createGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creatorId = req.user?.userId;
      const result = await gamesService.createGame(req.body, creatorId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
