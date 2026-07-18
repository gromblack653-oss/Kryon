import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool';
import { invalidate } from '../../db/redis';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { NotFoundError } from '../../utils/errors';

const router = Router({ mergeParams: true });

interface ReviewRow {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  author_name: string;
  user_id: string;
  verified: boolean;
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).default(''),
});

async function ensureProduct(productId: string): Promise<void> {
  const rows = await query('SELECT 1 FROM products WHERE id = $1', [productId]);
  if (!rows.length) throw new NotFoundError('Product not found');
}

/**
 * @openapi
 * /api/products/{productId}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Відгуки про товар (із позначкою підтвердженої покупки)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const productId = req.params.productId;
    await ensureProduct(productId);

    const items = await query<ReviewRow>(
      `SELECT r.id, r.rating, r.body, r.created_at, r.user_id, u.name AS author_name,
              EXISTS (
                SELECT 1 FROM orders o
                JOIN order_items oi ON oi.order_id = o.id
                WHERE o.user_id = r.user_id AND oi.product_id = r.product_id
                  AND o.status IN ('paid', 'shipped', 'delivered')
              ) AS verified
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC`,
      [productId],
    );

    const dist = await query<{ rating: number; count: number }>(
      `SELECT rating, COUNT(*)::int AS count FROM reviews WHERE product_id = $1 GROUP BY rating`,
      [productId],
    );
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of dist) distribution[d.rating] = d.count;

    const count = items.length;
    const average = count ? Number((items.reduce((s, r) => s + r.rating, 0) / count).toFixed(1)) : 0;

    res.json({ items, count, average, distribution });
  }),
);

/**
 * @openapi
 * /api/products/{productId}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Залишити або оновити свій відгук (customer)
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/',
  authenticate,
  authorize('customer'),
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const productId = req.params.productId;
    await ensureProduct(productId);

    const rows = await query<{ id: string }>(
      `INSERT INTO reviews (product_id, user_id, rating, body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body, updated_at = now()
       RETURNING id`,
      [productId, req.user!.id, req.body.rating, req.body.body],
    );
    await invalidate('products:list:*');
    res.status(201).json({ id: rows[0].id });
  }),
);

/**
 * @openapi
 * /api/products/{productId}/reviews:
 *   delete:
 *     tags: [Reviews]
 *     summary: Видалити власний відгук (customer)
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/',
  authenticate,
  authorize('customer'),
  asyncHandler(async (req, res) => {
    await query('DELETE FROM reviews WHERE product_id = $1 AND user_id = $2', [
      req.params.productId,
      req.user!.id,
    ]);
    await invalidate('products:list:*');
    res.status(204).send();
  }),
);

export default router;
