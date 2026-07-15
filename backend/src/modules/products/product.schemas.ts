import { z } from 'zod';

/** Query-параметри каталогу: пагінація, пошук, фільтри, сортування. */
export const listProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().max(100).optional(),
  type: z.string().optional(), // ключ типу компонента: gpu, cpu, ram, psu, case
  category: z.string().optional(), // slug категорії
  minPrice: z.coerce.number().int().min(0).optional(), // у гривнях
  maxPrice: z.coerce.number().int().min(0).optional(),
  // 'true' → лише товари в наявності (frontend не надсилає при вимкненому фільтрі).
  inStock: z.coerce.boolean().optional(),
  /**
   * Генеричні faceted-фільтри за характеристиками:
   * "vram_gb:8,16;memory_type:GDDR7" — ключ атрибута, значення через кому,
   * різні атрибути через крапку з комою (між атрибутами — AND, всередині — OR).
   */
  attrs: z.string().max(500).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'title', 'rating']).default('newest'),
});

export const facetsSchema = listProductsSchema.omit({ page: true, limit: true, sort: true });

export const compareSchema = z.object({
  ids: z.string().min(1), // uuid через кому
});

export const createProductSchema = z.object({
  title: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'slug: лише малі латинські літери, цифри та дефіс'),
  description: z.string().max(5000).default(''),
  price: z.number().int().min(0), // ціна у копійках/центах
  stock: z.number().int().min(0).default(0),
  categoryId: z.string().uuid().optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
