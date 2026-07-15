import { Router } from 'express';
import { z } from 'zod';
import { crmRepository } from './crm.repository';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { uploadAudio } from '../../middleware/upload';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { env } from '../../config/env';

const router = Router();

// CRM доступна працівникам: admin та agent.
router.use(authenticate, authorize('admin', 'agent'));

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

const callSchema = z.object({
  phone: z.string().min(3).max(30),
  direction: z.enum(['outbound', 'inbound']).default('outbound'),
  outcome: z.enum(['answered', 'no_answer', 'busy', 'voicemail', 'failed']).default('answered'),
  durationSeconds: z.number().int().min(0).max(86400).default(0),
  note: z.string().max(1000).default(''),
});

const noteSchema = z.object({
  type: z.enum(['note', 'task', 'meeting', 'email']).default('note'),
  body: z.string().min(1).max(2000),
});

const phoneSchema = z.object({ phone: z.string().max(30).nullable() });

const callsQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest', 'outcome', 'duration']).default('newest'),
});

/**
 * @openapi
 * /api/crm/stats:
 *   get: { tags: [CRM], summary: Статистика дашборду CRM, security: [{ bearerAuth: [] }] }
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    res.json(await crmRepository.stats(req.user!.id));
  }),
);

/**
 * @openapi
 * /api/crm/customers:
 *   get: { tags: [CRM], summary: Клієнти з агрегатами (замовлення, витрати, дзвінки), security: [{ bearerAuth: [] }] }
 */
router.get(
  '/customers',
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, search } = req.query as unknown as { page: number; limit: number; search?: string };
    res.json(await crmRepository.listCustomers(search, page, limit));
  }),
);

/**
 * @openapi
 * /api/crm/customers/{id}:
 *   get: { tags: [CRM], summary: Профіль клієнта + замовлення + дзвінки + нотатки, security: [{ bearerAuth: [] }] }
 */
router.get(
  '/customers/:id',
  asyncHandler(async (req, res) => {
    const customer = await crmRepository.getCustomer(req.params.id);
    if (!customer) throw new NotFoundError('Customer not found');
    const [orders, calls, notes] = await Promise.all([
      crmRepository.customerOrders(customer.id),
      crmRepository.customerCalls(customer.id),
      crmRepository.customerNotes(customer.id),
    ]);
    res.json({ customer, orders, calls, notes });
  }),
);

/**
 * @openapi
 * /api/crm/orders/{id}/items:
 *   get: { tags: [CRM], summary: Позиції (товари) замовлення, security: [{ bearerAuth: [] }] }
 */
router.get(
  '/orders/:id/items',
  asyncHandler(async (req, res) => {
    res.json(await crmRepository.orderItems(req.params.id));
  }),
);

/**
 * @openapi
 * /api/crm/customers/{id}/phone:
 *   patch: { tags: [CRM], summary: Оновити телефон клієнта, security: [{ bearerAuth: [] }] }
 */
router.patch(
  '/customers/:id/phone',
  validate(phoneSchema),
  asyncHandler(async (req, res) => {
    await crmRepository.updatePhone(req.params.id, req.body.phone);
    res.json(await crmRepository.getCustomer(req.params.id));
  }),
);

/**
 * @openapi
 * /api/crm/customers/{id}/calls:
 *   post: { tags: [CRM], summary: Записати дзвінок клієнту (MicroSIP), security: [{ bearerAuth: [] }] }
 */
router.post(
  '/customers/:id/calls',
  validate(callSchema),
  asyncHandler(async (req, res) => {
    const call = await crmRepository.logCall({
      customerId: req.params.id,
      agentId: req.user!.id,
      ...req.body,
    });
    res.status(201).json(call);
  }),
);

/**
 * @openapi
 * /api/crm/customers/{id}/notes:
 *   post: { tags: [CRM], summary: Додати нотатку/активність, security: [{ bearerAuth: [] }] }
 */
router.post(
  '/customers/:id/notes',
  validate(noteSchema),
  asyncHandler(async (req, res) => {
    const note = await crmRepository.addNote({
      customerId: req.params.id,
      agentId: req.user!.id,
      ...req.body,
    });
    res.status(201).json(note);
  }),
);

/**
 * @openapi
 * /api/crm/calls:
 *   get: { tags: [CRM], summary: Останні дзвінки, security: [{ bearerAuth: [] }] }
 *   post: { tags: [CRM], summary: Записати довільний дзвінок (без привʼязки до клієнта), security: [{ bearerAuth: [] }] }
 */
router.get(
  '/calls',
  validate(callsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { sort } = req.query as unknown as { sort: 'newest' | 'oldest' | 'outcome' | 'duration' };
    res.json(await crmRepository.recentCalls(100, sort));
  }),
);

router.post(
  '/calls',
  validate(callSchema),
  asyncHandler(async (req, res) => {
    const call = await crmRepository.logCall({ customerId: null, agentId: req.user!.id, ...req.body });
    res.status(201).json(call);
  }),
);

/**
 * @openapi
 * /api/crm/calls/{id}/recording:
 *   post: { tags: [CRM], summary: Завантажити аудіозапис дзвінка, security: [{ bearerAuth: [] }] }
 */
router.post(
  '/calls/:id/recording',
  uploadAudio.single('recording'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new BadRequestError('Файл запису обовʼязковий (поле "recording")');
    const url = `/${env.upload.dir}/${req.file.filename}`;
    const call = await crmRepository.setRecording(req.params.id, url);
    if (!call) throw new NotFoundError('Call not found');
    res.json(call);
  }),
);

export default router;
