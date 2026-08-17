import { Request, Response, NextFunction } from 'express';
import { WalletService } from './wallet.service';

const walletService = new WalletService();

export class WalletController {
  public static async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const balance = await walletService.getBalance(userId);
      res.status(200).json({ success: true, data: balance });
    } catch (error) {
      next(error);
    }
  }

  public static async deposit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await walletService.processDemoDeposit(userId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async withdraw(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await walletService.processDemoWithdrawal(userId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async initializeChapa(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await walletService.initializeChapaDeposit(userId, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async verifyChapa(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const txRef = req.params.txRef || (req.query.tx_ref as string);
      const result = await walletService.verifyChapaDeposit(userId, txRef);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public static async chapaWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await walletService.handleChapaWebhook(req.body);
      res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      next(error);
    }
  }

  public static async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const page = parseInt(req.query.page as string, 10) || 1;
      const data = await walletService.getTransactions(userId, limit, page);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
