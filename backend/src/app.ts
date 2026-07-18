import path from 'path';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { notFound, errorHandler } from './middleware/error';

import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/product.routes';
import categoryRoutes from './modules/categories/category.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/orders/order.routes';
import adminRoutes from './modules/admin/admin.routes';
import crmRoutes from './modules/crm/crm.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import builderRoutes from './modules/builder/builder.routes';
import deliveryRoutes from './modules/delivery/delivery.routes';
import paymentRoutes from './modules/payments/payment.routes';
import telephonyRoutes from './modules/crm/telephony.routes';
import reviewRoutes from './modules/reviews/review.routes';

export function createApp(): Express {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  // Вебхук шлюзу підписується від СИРОГО тіла — тому raw-парсер тут, до express.json().
  // (body-parser позначає тіло як розібране, тож json() цей шлях пропустить.)
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use('/api/telephony/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan('dev'));

  // Статика для завантажених зображень товарів.
  app.use(`/${env.upload.dir}`, express.static(path.resolve(process.cwd(), env.upload.dir)));

  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  // Відгуки — до /api/products, щоб вкладений шлях не перехопився роутом товару.
  app.use('/api/products/:productId/reviews', reviewRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/crm', crmRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/builder', builderRoutes);
  app.use('/api/delivery', deliveryRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/telephony', telephonyRoutes);

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
