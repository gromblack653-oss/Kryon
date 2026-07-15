import { Router } from 'express';
import { z } from 'zod';
import { cartRepository } from './cart.repository';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// Усі маршрути кошика — лише для авторизованих покупців.
router.use(authenticate, authorize('customer'));

const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

const setQtySchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

/**
 * @openapi
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Кошик поточного користувача
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await cartRepository.view(req.user!.id));
  }),
);

/**
 * @openapi
 * /api/cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Додати товар у кошик
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/items',
  validate(addItemSchema),
  asyncHandler(async (req, res) => {
    await cartRepository.addItem(req.user!.id, req.body.productId, req.body.quantity);
    res.status(201).json(await cartRepository.view(req.user!.id));
  }),
);

/**
 * @openapi
 * /api/cart/items/{productId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Змінити кількість товару
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/items/:productId',
  validate(setQtySchema),
  asyncHandler(async (req, res) => {
    await cartRepository.setQuantity(req.user!.id, req.params.productId, req.body.quantity);
    res.json(await cartRepository.view(req.user!.id));
  }),
);

/**
 * @openapi
 * /api/cart/items/{productId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Прибрати товар із кошика
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/items/:productId',
  asyncHandler(async (req, res) => {
    await cartRepository.removeItem(req.user!.id, req.params.productId);
    res.json(await cartRepository.view(req.user!.id));
  }),
);

export default router;
