import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Реєстрація нового користувача
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *     responses:
 *       201: { description: Створено, повертає user + токени }
 *       409: { description: Email вже зареєстровано }
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Вхід
 *     responses:
 *       200: { description: user + accessToken + refreshToken }
 *       401: { description: Невірні облікові дані }
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Оновлення пари токенів (з ротацією)
 */
router.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Вихід (відкликає refresh-токен)
 */
router.post('/logout', authController.logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Поточний користувач
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', authenticate, authController.me);

export default router;
