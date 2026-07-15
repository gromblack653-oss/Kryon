import { Request, Response } from 'express';
import { authService } from './auth.service';
import { userRepository } from '../users/user.repository';
import { asyncHandler } from '../../utils/asyncHandler';
import { UnauthorizedError } from '../../utils/errors';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const tokens = await authService.refresh(req.body.refreshToken);
    res.json(tokens);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken ?? '');
    res.status(204).send();
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const user = await userRepository.findById(req.user.id);
    res.json({ user });
  }),
};
