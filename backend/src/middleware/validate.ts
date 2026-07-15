import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { BadRequestError } from '../utils/errors';

type Target = 'body' | 'query' | 'params';

/**
 * Middleware-фабрика для валідації через Zod.
 * Замінює req[target] на розпарсені (типізовані) дані.
 */
export const validate =
  (schema: ZodSchema, target: Target = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw new BadRequestError('Validation failed', details);
    }
    // query/params у Express — read-only getter, тож мутуємо обережно.
    if (target === 'body') req.body = result.data;
    else Object.assign(req[target], result.data);
    next();
  };
