import { z } from 'zod';

const phoneRegex = /^\+?\d{10,13}$/;

export const createOrderSchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1, 'Кошик порожній'),
    shippingAddress: z.string().min(5).max(300),
    deliveryMethod: z.enum(['np_warehouse', 'np_courier', 'pickup']).default('np_warehouse'),
    paymentMethod: z.enum(['card', 'cod']).default('cod'),
    recipientName: z.string().min(3).max(120).optional(),
    recipientPhone: z.string().regex(phoneRegex, 'Телефон у форматі +380XXXXXXXXX').optional(),
    guestName: z.string().min(3).max(120).optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().regex(phoneRegex, 'Телефон у форматі +380XXXXXXXXX').optional(),
    npCityRef: z.string().optional(),
    npWarehouseRef: z.string().optional(),
  })
  .refine((v) => v.deliveryMethod !== 'np_warehouse' || (v.npCityRef && v.npWarehouseRef), {
    message: 'Для доставки у відділення оберіть місто та відділення',
    path: ['npWarehouseRef'],
  });

export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled']),
});

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
