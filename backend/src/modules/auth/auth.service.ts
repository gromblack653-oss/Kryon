import bcrypt from 'bcryptjs';
import { userRepository } from '../users/user.repository';
import { tokenService } from './token.service';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import { AuthUser, User } from '../../types';
import { LoginInput, RegisterInput } from './auth.schemas';

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

async function issueTokens(user: AuthUser): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = tokenService.signAccessToken(user);
  const refreshToken = await tokenService.issueRefreshToken(user);
  return { accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const tokens = await issueTokens({ id: user.id, role: user.role, email: user.email });
    return { user, ...tokens };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const row = await userRepository.findByEmail(input.email);
    if (!row) throw new UnauthorizedError('Invalid credentials');

    const ok = await bcrypt.compare(input.password, row.password_hash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    const user: User = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      created_at: row.created_at,
    };
    const tokens = await issueTokens({ id: user.id, role: user.role, email: user.email });
    return { user, ...tokens };
  },

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { userId, tokenId } = await tokenService.verifyRefreshToken(refreshToken);
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError();

    await tokenService.revokeRefreshToken(userId, tokenId);
    return issueTokens({ id: user.id, role: user.role, email: user.email });
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      const { userId, tokenId } = await tokenService.verifyRefreshToken(refreshToken);
      await tokenService.revokeRefreshToken(userId, tokenId);
    } catch {}
  },
};
