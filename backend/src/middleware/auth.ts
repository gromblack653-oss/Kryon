import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { JwtPayload, UserRole } from '../types';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing access token');
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}
