import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';

const usersService = new UsersService();

export class UsersController {
  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const profile = await usersService.getProfile(userId);
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  public static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const profile = await usersService.updateProfile(userId, req.body);
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  public static async updateResponsibleGaming(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await usersService.updateResponsibleGaming(userId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async submitKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await usersService.submitKyc(userId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
