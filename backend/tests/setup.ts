// Глобальні env-змінні для тестів (щоб config/env не падав).
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
