import { Request, Response, NextFunction } from 'express';
import { NotificationsService } from './notifications.service';

const notificationsService = new NotificationsService();

export class NotificationsController {
  public static async getMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = await notificationsService.getUserNotifications(userId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await notificationsService.markAsRead(userId, id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await notificationsService.markAllAsRead(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
