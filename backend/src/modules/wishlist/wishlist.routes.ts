import { Router } from 'express';
import { query } from '../../db/pool';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { NotFoundError } from '../../utils/errors';

const router = Router();

router.use(authenticate, authorize('customer'));

interface WishlistProduct {
  id: string;
  title: string;
  slug: string;
  price_cents: number;
  stock: number;
  image_url: string | null;
  category_name: string | null;
  added_at: string;
}

/**
 * @openapi
 * /api/wishlist:
 *   get:
 *     tags: [Wishlist]
 *     summary: Обрані товари користувача
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await query<WishlistProduct>(
      `SELECT p.id, p.title, p.slug, p.price_cents, p.stock, p.image_url,
              c.name AS category_name, w.created_at AS added_at
       FROM wishlist_items w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user!.id],
    );
    res.json({ items, ids: items.map((i) => i.id) });
  }),
);

/**
 * @openapi
 * /api/wishlist/{productId}:
 *   post:
 *     tags: [Wishlist]
 *     summary: Додати товар в обране
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:productId',
  asyncHandler(async (req, res) => {
    const exists = await query('SELECT 1 FROM products WHERE id = $1', [req.params.productId]);
    if (!exists.length) throw new NotFoundError('Product not found');

    await query(
      `INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [req.user!.id, req.params.productId],
    );
    res.status(201).json({ ok: true });
  }),
);

/**
 * @openapi
 * /api/wishlist/{productId}:
 *   delete:
 *     tags: [Wishlist]
 *     summary: Прибрати товар з обраного
 *     security: [{ bearerAuth: [] }]
 */
router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2', [
      req.user!.id,
      req.params.productId,
    ]);
    res.status(204).send();
  }),
);

export default router;
