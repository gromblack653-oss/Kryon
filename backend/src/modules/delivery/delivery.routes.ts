import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { searchCities, listWarehouses, isLiveNp } from './np.client';

const router = Router();

const citiesSchema = z.object({ q: z.string().max(80).default('') });
const warehousesSchema = z.object({
  cityRef: z.string().min(1),
  q: z.string().max(80).default(''),
});

/**
 * @openapi
 * /api/delivery/cities:
 *   get:
 *     tags: [Delivery]
 *     summary: Пошук міст Нової Пошти
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 */
router.get(
  '/cities',
  validate(citiesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { q } = req.query as unknown as z.infer<typeof citiesSchema>;
    res.json({ items: await searchCities(q), live: isLiveNp() });
  }),
);

/**
 * @openapi
 * /api/delivery/warehouses:
 *   get:
 *     tags: [Delivery]
 *     summary: Відділення Нової Пошти в місті
 *     parameters:
 *       - in: query
 *         name: cityRef
 *         required: true
 *         schema: { type: string }
 */
router.get(
  '/warehouses',
  validate(warehousesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { cityRef, q } = req.query as unknown as z.infer<typeof warehousesSchema>;
    res.json({ items: await listWarehouses(cityRef, q) });
  }),
);

export default router;
