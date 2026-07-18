import { Router, raw } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import {
  createSession,
  handleWebhook,
  verifySignature,
  mockGatewayComplete,
  findByExternalId,
  type WebhookEvent,
} from './payment.service';

const router = Router();

/**
 * @openapi
 * /api/payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Вебхук платіжного шлюзу
 *     description: Тіло перевіряється підписом HMAC-SHA256 у заголовку X-Signature. Ідемпотентний.
 */
router.post(
  '/webhook',
  raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const rawBody = (req.body as Buffer).toString('utf8');
    const signature = String(req.header('X-Signature') ?? '');

    if (!verifySignature(rawBody, signature)) throw new BadRequestError('Invalid signature');

    const event = JSON.parse(rawBody) as WebhookEvent;
    const result = await handleWebhook(event);
    res.json({ ok: true, ...result });
  }),
);

/**
 * @openapi
 * /api/payments/{externalId}:
 *   get:
 *     tags: [Payments]
 *     summary: Стан платежу (для сторінки оплати)
 */
router.get(
  '/:externalId',
  asyncHandler(async (req, res) => {
    const payment = await findByExternalId(req.params.externalId);
    if (!payment) throw new NotFoundError('Payment not found');
    res.json({
      externalId: payment.external_id,
      orderId: payment.order_id,
      amountCents: payment.amount_cents,
      status: payment.status,
    });
  }),
);

/**
 * @openapi
 * /api/payments/mock/{externalId}/complete:
 *   post:
 *     tags: [Payments]
 *     summary: Емуляція дії покупця на сторінці шлюзу (demo)
 *     description: Шлюз формує підписану подію і викликає власний вебхук — як справжній PSP.
 */
router.post(
  '/mock/:externalId/complete',
  validate(z.object({ outcome: z.enum(['paid', 'failed']) })),
  asyncHandler(async (req, res) => {
    const result = await mockGatewayComplete(req.params.externalId, req.body.outcome);
    res.json({ ok: true, ...result });
  }),
);

/**
 * @openapi
 * /api/payments/orders/{orderId}/session:
 *   post:
 *     tags: [Payments]
 *     summary: Створити платіжну сесію для замовлення
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/orders/:orderId/session',
  authenticate,
  authorize('customer'),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createSession(req.params.orderId, req.user!.id));
  }),
);

export default router;
