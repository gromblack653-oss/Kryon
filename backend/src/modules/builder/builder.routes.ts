import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { listParts, findParts } from './builder.repository';
import { checkBuild, BUILD_SLOTS, type BuildSelection, type PartType } from './compatibility';

const router = Router();

/**
 * @openapi
 * /api/builder/parts:
 *   get:
 *     tags: [Builder]
 *     summary: Комплектуючі для збірки ПК, згруповані за типом
 */
router.get(
  '/parts',
  asyncHandler(async (_req, res) => {
    res.json({ slots: BUILD_SLOTS, parts: await listParts() });
  }),
);

// Кожен слот — необов'язковий id товару: перевіряємо і часткові збірки.
const selectionSchema = z.object({
  cpu: z.string().uuid().optional(),
  mobo: z.string().uuid().optional(),
  ram: z.string().uuid().optional(),
  gpu: z.string().uuid().optional(),
  psu: z.string().uuid().optional(),
  case: z.string().uuid().optional(),
});

/**
 * @openapi
 * /api/builder/check:
 *   post:
 *     tags: [Builder]
 *     summary: Перевірити сумісність збірки
 *     description: Повертає помилки/попередження, оцінку споживання та рекомендовану потужність БЖ.
 */
router.post(
  '/check',
  validate(selectionSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as Partial<Record<PartType, string>>;
    const ids = Object.values(body).filter(Boolean) as string[];
    const rows = await findParts(ids);
    const byId = new Map(rows.map((r) => [r.id, r]));

    // Збираємо вибір за слотами; ігноруємо id, що не належать типу слота.
    const selection: BuildSelection = {};
    for (const [slot, id] of Object.entries(body) as Array<[PartType, string | undefined]>) {
      const part = id ? byId.get(id) : undefined;
      if (part && part.type === slot) selection[slot] = part;
    }

    res.json(checkBuild(selection));
  }),
);

export default router;
