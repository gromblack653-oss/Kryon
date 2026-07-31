import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../db/pool';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ConflictError, NotFoundError } from '../../utils/errors';

const router = Router();

router.use(authenticate, authorize('admin'));

const operatorSchema = z.object({
  name: z.string().min(2, 'Мінімум 2 символи').max(80),
  email: z.string().email('Некоректний email'),
  password: z
    .string()
    .min(8, 'Пароль має містити щонайменше 8 символів')
    .regex(/[A-Z]/, 'Потрібна велика літера')
    .regex(/[0-9]/, 'Потрібна цифра'),
  phone: z.string().max(30).optional(),
});

type OperatorInput = z.infer<typeof operatorSchema>;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Очікує оплати',
  paid: 'Оплачено',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  cancelled: 'Скасовано',
};

function csvCell(value: unknown): string {
  const s = String(value ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * @openapi
 * /api/admin/orders/export:
 *   get:
 *     tags: [Admin]
 *     summary: Вивантаження всіх замовлень у CSV (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: CSV-файл замовлень }
 */
router.get(
  '/orders/export',
  asyncHandler(async (_req, res) => {
    const rows = await query<{
      id: string;
      created_at: string;
      status: string;
      total_cents: number;
      customer_name: string;
      customer_email: string;
      customer_phone: string | null;
      shipping_address: string;
      items: string;
    }>(
      `SELECT o.id, o.created_at, o.status, o.total_cents, o.shipping_address,
              COALESCE(u.name, o.guest_name, 'Гість') AS customer_name,
              COALESCE(u.email, o.guest_email, '') AS customer_email,
              COALESCE(u.phone, o.guest_phone) AS customer_phone,
              COALESCE(string_agg(oi.title || ' x' || oi.quantity, '; '), '') AS items
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id, u.name, u.email, u.phone, o.guest_name, o.guest_email, o.guest_phone
       ORDER BY o.created_at DESC`,
    );

    const header = [
      '№ замовлення',
      'Дата',
      'Статус',
      'Клієнт',
      'Email',
      'Телефон',
      'Адреса',
      'Товари',
      'Сума, грн',
    ];
    const lines = rows.map((r) =>
      [
        r.id.slice(0, 8).toUpperCase(),
        new Date(r.created_at).toLocaleString('uk-UA'),
        STATUS_LABELS[r.status] ?? r.status,
        r.customer_name,
        r.customer_email,
        r.customer_phone ?? '',
        r.shipping_address,
        r.items,
        (r.total_cents / 100).toFixed(2),
      ]
        .map(csvCell)
        .join(','),
    );
    const csv = '﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-export.csv"`);
    res.send(csv);
  }),
);

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Зведена статистика для дашборду (admin)
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [products] = await query<{
      total: number;
      active: number;
      out_of_stock: number;
      low_stock: number;
    }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_active)::int AS active,
              COUNT(*) FILTER (WHERE stock = 0)::int AS out_of_stock,
              COUNT(*) FILTER (WHERE stock > 0 AND stock <= 5)::int AS low_stock
       FROM products`,
    );

    const [customers] = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM users WHERE role = 'customer'`,
    );

    const ordersByStatus = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status`,
    );

    const [revenue] = await query<{ total_cents: number; orders: number }>(
      `SELECT COALESCE(SUM(total_cents), 0)::bigint AS total_cents,
              COUNT(*)::int AS orders
       FROM orders
       WHERE status IN ('paid', 'shipped', 'delivered')`,
    );

    const recentOrders = await query(
      `SELECT o.id, o.status, o.total_cents, o.created_at, o.payment_method,
              COALESCE(u.name, o.guest_name, 'Гість') AS customer_name
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 8`,
    );

    const topProducts = await query(
      `SELECT p.id, p.title, COALESCE(SUM(oi.quantity), 0)::int AS sold
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       GROUP BY p.id, p.title
       ORDER BY sold DESC LIMIT 5`,
    );

    const revenueByDay = await query<{ day: string; cents: number }>(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              COALESCE(SUM(o.total_cents), 0)::bigint AS cents
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
         LEFT JOIN orders o
                ON o.created_at::date = d.day
               AND o.status IN ('paid', 'shipped', 'delivered')
        GROUP BY d.day
        ORDER BY d.day`,
    );

    const lowStock = await query(
      `SELECT id, title, stock, image_url
         FROM products
        WHERE is_active AND stock <= 5
        ORDER BY stock ASC, title
        LIMIT 6`,
    );

    res.json({
      products,
      customers: customers.total,
      ordersByStatus: Object.fromEntries(ordersByStatus.map((r) => [r.status, r.count])),
      revenueCents: Number(revenue.total_cents),
      paidOrders: revenue.orders,
      recentOrders,
      topProducts,
      revenueByDay: revenueByDay.map((r) => ({ day: r.day, cents: Number(r.cents) })),
      lowStock,
    });
  }),
);

/**
 * @openapi
 * /api/admin/operators:
 *   get:
 *     tags: [Admin]
 *     summary: Список операторів CRM (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Масив операторів (role=agent) }
 */
router.get(
  '/operators',
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              (SELECT COUNT(*) FROM call_logs c WHERE c.agent_id = u.id)::int AS calls
         FROM users u
        WHERE u.role = 'agent'
        ORDER BY u.created_at DESC`,
    );
    res.json(rows);
  }),
);

/**
 * @openapi
 * /api/admin/operators:
 *   post:
 *     tags: [Admin]
 *     summary: Створити оператора CRM (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Оператора створено }
 *       409: { description: Email вже зареєстровано }
 */
router.post(
  '/operators',
  validate(operatorSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, phone } = req.body as OperatorInput;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length) throw new ConflictError('Email вже зареєстровано');

    const passwordHash = await bcrypt.hash(password, 10);
    const [operator] = await query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      created_at: string;
    }>(
      `INSERT INTO users (email, password_hash, name, role, phone)
       VALUES ($1, $2, $3, 'agent', $4)
       RETURNING id, name, email, phone, created_at`,
      [email, passwordHash, name, phone || null],
    );
    res.status(201).json({ ...operator, calls: 0 });
  }),
);

/**
 * @openapi
 * /api/admin/operators/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Видалити оператора CRM (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Видалено }
 *       404: { description: Оператора не знайдено }
 */
router.delete(
  '/operators/:id',
  asyncHandler(async (req, res) => {
    const rows = await query(`DELETE FROM users WHERE id = $1 AND role = 'agent' RETURNING id`, [
      req.params.id,
    ]);
    if (!rows.length) throw new NotFoundError('Оператора не знайдено');
    res.status(204).send();
  }),
);

export default router;
