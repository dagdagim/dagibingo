import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

export const validateBody = (schema: ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new BadRequestError('Validation failed', 'VALIDATION_ERROR', details));
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = (schema: ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new BadRequestError('Query parameter validation failed', 'VALIDATION_ERROR', details));
      } else {
        next(error);
      }
    }
  };
};
