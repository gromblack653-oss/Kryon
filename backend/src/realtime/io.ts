import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { JwtPayload } from '../types';

let io: IOServer | null = null;

/**
 * Ініціалізує Socket.IO поверх HTTP-сервера.
 * Клієнти автентифікуються через access-токен у handshake.auth.token
 * і приєднуються до персональної кімнати `user:<id>`.
 */
export function initIO(server: HttpServer): IOServer {
  io = new IOServer(server, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Auth token required'));
    try {
      const payload = jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    if (socket.data.role === 'admin') socket.join('admins');
    logger.info('WS client connected', { userId });

    socket.on('disconnect', () => logger.info('WS client disconnected', { userId }));
  });

  return io;
}

export function getIO(): IOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

/** Надсилає подію конкретному користувачу. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

/** Надсилає подію всім адміністраторам (напр., нове замовлення). */
export function emitToAdmins(event: string, payload: unknown): void {
  io?.to('admins').emit(event, payload);
}
