import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/** 404 для невідомих маршрутів. */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}` } });
}

/** Централізований обробник помилок. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  logger.error('Unhandled error', { error: err instanceof Error ? err.stack : String(err) });
  res.status(500).json({
    error: {
      message: 'Internal server error',
      ...(env.isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    },
  });
}
