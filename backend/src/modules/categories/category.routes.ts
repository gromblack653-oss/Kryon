import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { invalidate } from '../../db/redis';

const router = Router();

interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

const createCategorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [Categories]
 *     summary: Список категорій
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const rows = type
      ? await query<Category>(
          `SELECT c.* FROM categories c
           JOIN product_types t ON t.id = c.type_id
           WHERE t.key = $1 ORDER BY c.name`,
          [type],
        )
      : await query<Category>('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  }),
);

/**
 * @openapi
 * /api/categories:
 *   post:
 *     tags: [Categories]
 *     summary: Створити категорію (admin)
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    const { name, slug } = req.body;
    const rows = await query<Category>('INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *', [
      name,
      slug,
    ]);
    await invalidate('products:list:*');
    res.status(201).json(rows[0]);
  }),
);

export default router;
