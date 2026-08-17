import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'APP_ERROR';
    details = err.details;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    code = 'MONGOOSE_VALIDATION_ERROR';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID or query parameter';
    code = 'INVALID_ID';
  }

  logger.error(`[${req.method}] ${req.originalUrl} - ${statusCode} - ${err.message}`, {
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(env.NODE_ENV === 'development' && err.stack ? { stack: err.stack } : {}),
    },
  });
};
