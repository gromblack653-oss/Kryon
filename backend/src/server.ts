import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectRedis } from './db/redis';
import { initIO } from './realtime/io';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  connectRedis(); // фоново, не блокує старт сервера

  const app = createApp();
  const server = http.createServer(app);
  initIO(server);

  server.listen(env.port, () => {
    logger.info(`ShopCore API running`, {
      port: env.port,
      docs: `http://localhost:${env.port}/api/docs`,
    });
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: String(err) });
  process.exit(1);
});
