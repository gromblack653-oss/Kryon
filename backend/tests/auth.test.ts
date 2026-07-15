import request from 'supertest';

// Мокаємо шар доступу до даних та Redis, щоб тести не залежали від інфраструктури.
jest.mock('../src/db/redis', () => ({
  redis: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
  connectRedis: jest.fn(),
  cached: (_k: string, _t: number, loader: () => unknown) => loader(),
  invalidate: jest.fn(),
}));

jest.mock('../src/modules/users/user.repository', () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  },
}));

import { createApp } from '../src/app';
import { userRepository } from '../src/modules/users/user.repository';

const app = createApp();
const mockRepo = userRepository as jest.Mocked<typeof userRepository>;

describe('Auth API', () => {
  it('GET /health повертає ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('відхиляє реєстрацію з невалідними даними (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123', name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
  });

  it('реєструє нового користувача (201) і повертає токени', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({
      id: 'u1',
      email: 'new@shopcore.dev',
      name: 'New User',
      role: 'customer',
      created_at: new Date().toISOString(),
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'new@shopcore.dev',
      password: 'Strong123',
      name: 'New User',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new@shopcore.dev');
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
  });

  it('повертає 409 якщо email уже зайнятий', async () => {
    mockRepo.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'dup@shopcore.dev',
      name: 'Dup',
      role: 'customer',
      password_hash: 'x',
      created_at: new Date().toISOString(),
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'dup@shopcore.dev',
      password: 'Strong123',
      name: 'Dup User',
    });

    expect(res.status).toBe(409);
  });

  it('блокує доступ до /api/auth/me без токена (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
