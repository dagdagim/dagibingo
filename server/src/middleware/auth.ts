import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '@bingo/shared';
import { User } from '../models/User';

export interface JwtAuthPayload {
  userId: string;
  role: UserRole;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtAuthPayload;
    }
  }
}

export const authenticateJwt = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtAuthPayload;

    // Verify user is still active in database
    const user = await User.findById(decoded.userId).select('isActive role username');
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is inactive or no longer exists');
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      username: user.username,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired', 'TOKEN_EXPIRED'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token', 'INVALID_TOKEN'));
    } else {
      next(error);
    }
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access forbidden. Required role: ${roles.join(' or ')}`));
    }
    next();
  };
};
