import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import {
  startCall,
  handleEvent,
  verifySignature,
  mockPbxEvent,
  findCall,
  saveNote,
  type TelephonyEvent,
} from './telephony.service';

const router = Router();

/**
 * @openapi
 * /api/telephony/webhook:
 *   post:
 *     tags: [Telephony]
 *     summary: Вебхук АТС (answered / completed / no_answer / busy / failed)
 *     description: |
 *       Тіло перевіряється підписом HMAC-SHA256 у заголовку X-Signature.
 *       Обробка ідемпотентна: завершений дзвінок повторна подія не змінює.
 */
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const rawBody = (req.body as Buffer).toString('utf8');
    const signature = String(req.header('X-Signature') ?? '');
    if (!verifySignature(rawBody, signature)) throw new BadRequestError('Invalid signature');

    const result = await handleEvent(JSON.parse(rawBody) as TelephonyEvent);
    res.json({ ok: true, applied: result.applied });
  }),
);

router.use(authenticate, authorize('agent', 'admin'));

const startSchema = z.object({
  phone: z.string().min(5).max(30),
  customerId: z.string().uuid().nullable().optional(),
});

/**
 * @openapi
 * /api/telephony/calls:
 *   post:
 *     tags: [Telephony]
 *     summary: Почати дзвінок (оператор натиснув «Подзвонити»)
 *     description: Створює дзвінок у стані ringing. Результат і тривалість проставить АТС.
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/calls',
  validate(startSchema),
  asyncHandler(async (req, res) => {
    const call = await startCall({
      agentId: req.user!.id,
      customerId: req.body.customerId ?? null,
      phone: req.body.phone,
    });

    if (env.telephony.provider === 'mock') {
      setTimeout(() => {
        mockPbxEvent(call.external_id!, 'answered').catch((err) =>
          logger.warn('Mock PBX answer failed', { error: String(err) }),
        );
      }, env.telephony.mockAnswerAfterMs);
    }

    res.status(201).json(call);
  }),
);

/**
 * @openapi
 * /api/telephony/calls/{id}:
 *   get:
 *     tags: [Telephony]
 *     summary: Поточний стан дзвінка
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/calls/:id',
  asyncHandler(async (req, res) => {
    const call = await findCall(req.params.id);
    if (!call) throw new NotFoundError('Call not found');
    res.json(call);
  }),
);

const hangupSchema = z.object({
  event: z.enum(['completed', 'no_answer', 'busy', 'failed']),
});

/**
 * @openapi
 * /api/telephony/calls/{id}/hangup:
 *   post:
 *     tags: [Telephony]
 *     summary: Завершити дзвінок (демо — через емулятор АТС)
 *     description: |
 *       З реальною АТС завершення приходить вебхуком і ця ручка не потрібна.
 *       Тривалість у будь-якому разі рахує сервер за мітками часу, не оператор.
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/calls/:id/hangup',
  validate(hangupSchema),
  asyncHandler(async (req, res) => {
    const call = await findCall(req.params.id);
    if (!call?.external_id) throw new NotFoundError('Call not found');
    const result = await mockPbxEvent(call.external_id, req.body.event);
    res.json(result.call);
  }),
);

const noteSchema = z.object({ note: z.string().max(2000) });

/**
 * @openapi
 * /api/telephony/calls/{id}/note:
 *   patch:
 *     tags: [Telephony]
 *     summary: Нотатка до дзвінка — єдине, що заповнює оператор
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/calls/:id/note',
  validate(noteSchema),
  asyncHandler(async (req, res) => {
    res.json(await saveNote(req.params.id, req.body.note));
  }),
);

export default router;
