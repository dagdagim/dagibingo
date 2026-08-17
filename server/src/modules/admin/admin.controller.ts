import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';

const adminService = new AdminService();

export class AdminController {
  public static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getDashboardMetrics();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, role, kycStatus, page, limit } = req.query;
      const data = await adminService.listUsers(
        search as string,
        role as string,
        kycStatus as string,
        page ? parseInt(page as string, 10) : 1,
        limit ? parseInt(limit as string, 10) : 20
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const adminName = req.user!.username;
      const { id } = req.params;
      const { isActive } = req.body;
      await adminService.toggleUserStatus(adminId, adminName, id, Boolean(isActive));
      res.status(200).json({ success: true, message: `User status updated to ${isActive ? 'Active' : 'Suspended'}` });
    } catch (error) {
      next(error);
    }
  }

  public static async listGames(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const data = await adminService.listGames(page, limit);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async forceStartGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const adminName = req.user!.username;
      const { id } = req.params;
      await adminService.forceStartGame(adminId, adminName, id);
      res.status(200).json({ success: true, message: 'Game started successfully' });
    } catch (error) {
      next(error);
    }
  }

  public static async cancelGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const adminName = req.user!.username;
      const { id } = req.params;
      const { reason } = req.body;
      await adminService.cancelGame(adminId, adminName, id, reason || 'Cancelled by administrator');
      res.status(200).json({ success: true, message: 'Game cancelled' });
    } catch (error) {
      next(error);
    }
  }

  public static async listKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.listKycRecords();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async reviewKyc(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.userId;
      const adminName = req.user!.username;
      const { id } = req.params;
      const { status, reason } = req.body;
      await adminService.reviewKyc(adminId, adminName, id, status, reason);
      res.status(200).json({ success: true, message: `KYC updated to ${status}` });
    } catch (error) {
      next(error);
    }
  }

  public static async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const data = await adminService.listAuditLogs(limit);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async listBetRecords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.listBetRecords();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async listFraudAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.listFraudAlerts();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
