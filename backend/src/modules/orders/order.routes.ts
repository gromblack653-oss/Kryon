import { Router } from 'express';
import { orderService } from './order.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth';
import { createOrderSchema, listOrdersSchema, updateStatusSchema } from './order.schemas';
import { buildInvoicePdf, invoiceNumber } from '../invoices/invoice.service';
import { query } from '../../db/pool';
import { ForbiddenError, NotFoundError } from '../../utils/errors';

const router = Router();

/**
 * @openapi
 * /api/orders/{id}/invoice:
 *   get:
 *     tags: [Orders]
 *     summary: Завантажити накладну замовлення у PDF
 *     description: Доступно адміну, оператору CRM або власнику замовлення.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: PDF-файл накладної }
 */
router.get(
  '/:id/invoice',
  authenticate,
  asyncHandler(async (req, res) => {
    const role = req.user!.role;
    if (role !== 'admin' && role !== 'agent') {
      const rows = await query<{ user_id: string }>('SELECT user_id FROM orders WHERE id = $1', [
        req.params.id,
      ]);
      if (!rows[0]) throw new NotFoundError('Order not found');
      if (rows[0].user_id !== req.user!.id) throw new ForbiddenError();
    }

    const doc = await buildInvoicePdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${invoiceNumber(req.params.id)}.pdf"`,
    );
    doc.pipe(res);
    doc.end();
  }),
);

/**
 * @openapi
 * /api/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Оформити замовлення з кошика
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/',
  optionalAuthenticate,
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.checkout(req.user?.id ?? null, req.body);
    res.status(201).json(order);
  }),
);

/**
 * @openapi
 * /api/orders/{id}/confirmation:
 *   get:
 *     tags: [Orders]
 *     summary: Публічне підтвердження замовлення (для гостя) — доступ за UUID
 *     responses:
 *       200: { description: Безпечний зріз замовлення + позиції }
 *       404: { description: Замовлення не знайдено }
 */
router.get(
  '/:id/confirmation',
  asyncHandler(async (req, res) => {
    res.json(await orderService.getConfirmation(req.params.id));
  }),
);

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Мої замовлення (customer) або всі (admin)
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  authenticate,
  validate(listOrdersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result =
      req.user!.role === 'admin'
        ? await orderService.listAll(page, limit)
        : await orderService.listForUser(req.user!.id, page, limit);
    res.json({ ...result, page, limit });
  }),
);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Деталі замовлення
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const order = await orderService.getForUser(req.params.id, req.user!.id, req.user!.role);
    res.json(order);
  }),
);

/**
 * @openapi
 * /api/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Змінити статус замовлення (admin) — real-time сповіщення покупцю
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  validate(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    res.json(order);
  }),
);

export default router;
