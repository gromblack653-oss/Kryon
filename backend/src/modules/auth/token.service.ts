import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { redis } from '../../db/redis';
import { AuthUser, JwtPayload } from '../../types';

const refreshKey = (userId: string, tokenId: string) => `refresh:${userId}:${tokenId}`;

export const tokenService = {
  signAccessToken(user: AuthUser): string {
    const payload: JwtPayload = { sub: user.id, role: user.role, email: user.email };
    return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });
  },

  async issueRefreshToken(user: AuthUser): Promise<string> {
    const tokenId = randomUUID();
    const token = jwt.sign({ sub: user.id, jti: tokenId }, env.jwt.refreshSecret, {
      expiresIn: env.jwt.refreshTtl,
    });
    await redis.set(refreshKey(user.id, tokenId), '1', { EX: env.jwt.refreshTtl });
    return token;
  },

  async verifyRefreshToken(token: string): Promise<{ userId: string; tokenId: string }> {
    const decoded = jwt.verify(token, env.jwt.refreshSecret) as { sub: string; jti: string };
    const exists = await redis.get(refreshKey(decoded.sub, decoded.jti));
    if (!exists) throw new Error('Refresh token revoked');
    return { userId: decoded.sub, tokenId: decoded.jti };
  },

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await redis.del(refreshKey(userId, tokenId));
  },
};
