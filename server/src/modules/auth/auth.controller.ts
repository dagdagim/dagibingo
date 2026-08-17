import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await authService.register(req.body, ip, userAgent);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await authService.login(req.body, ip, userAgent);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, error: { message: 'Refresh token required' } });
        return;
      }
      const tokens = await authService.refreshToken(refreshToken);
      res.status(200).json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.userId) {
        await authService.logout(req.user.userId);
      }
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }
}
