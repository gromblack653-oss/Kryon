import { withTransaction, query } from '../../db/pool';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { invalidate } from '../../db/redis';
import { emitToAdmins, emitToUser } from '../../realtime/io';
import { OrderStatus, UserRole } from '../../types';
import { CreateOrderInput } from './order.schemas';
import { findCity, findWarehouse, generateTtn } from '../delivery/np.client';

export type DeliveryMethod = 'np_warehouse' | 'np_courier' | 'pickup';
export type PaymentMethod = 'card' | 'cod';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  user_id: string | null;
  status: OrderStatus;
  total_cents: number;
  shipping_address: string;
  delivery_method: DeliveryMethod;
  np_city_ref: string | null;
  np_city_name: string | null;
  np_warehouse_ref: string | null;
  np_warehouse_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  ttn: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  title: string;
  price_cents: number;
  quantity: number;
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

function allowedNext(order: Pick<Order, 'status' | 'payment_method'>): OrderStatus[] {
  const base = TRANSITIONS[order.status];
  if (order.payment_method === 'cod' && order.status === 'pending') {
    return [...base, 'shipped'];
  }
  return base;
}

export const orderService = {
  async checkout(userId: string | null, input: CreateOrderInput): Promise<Order> {
    if (!userId && (!input.guestName || !input.guestEmail || !input.guestPhone)) {
      throw new BadRequestError("Для замовлення без входу вкажіть ім'я, email і телефон");
    }

    const order = await withTransaction(async (client) => {
      const ids = input.items.map((i) => i.productId);
      const { rows: products } = await client.query<{
        id: string;
        title: string;
        price_cents: number;
        stock: number;
      }>(
        `SELECT id, title, price_cents, stock FROM products
         WHERE id = ANY($1::uuid[]) AND is_active
         FOR UPDATE`,
        [ids],
      );
      const byId = new Map(products.map((p) => [p.id, p]));

      const items = input.items.map((i) => {
        const p = byId.get(i.productId);
        if (!p) throw new BadRequestError('Один із товарів більше недоступний');
        if (i.quantity > p.stock) {
          throw new BadRequestError(
            `Недостатньо товару "${p.title}" на складі (є ${p.stock}, потрібно ${i.quantity})`,
          );
        }
        return { ...p, quantity: i.quantity };
      });

      const total = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);

      const city = input.npCityRef ? await findCity(input.npCityRef) : undefined;
      const warehouse =
        input.npCityRef && input.npWarehouseRef
          ? await findWarehouse(input.npCityRef, input.npWarehouseRef)
          : undefined;

      const { rows: orderRows } = await client.query<Order>(
        `INSERT INTO orders (user_id, total_cents, shipping_address, delivery_method,
                             np_city_ref, np_city_name, np_warehouse_ref, np_warehouse_name,
                             recipient_name, recipient_phone, guest_name, guest_email, guest_phone,
                             payment_method, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'unpaid') RETURNING *`,
        [
          userId,
          total,
          input.shippingAddress,
          input.deliveryMethod,
          input.npCityRef ?? null,
          city?.name ?? null,
          input.npWarehouseRef ?? null,
          warehouse ? `${warehouse.name} — ${warehouse.address}` : null,
          input.recipientName ?? null,
          input.recipientPhone ?? null,
          userId ? null : (input.guestName ?? null),
          userId ? null : (input.guestEmail ?? null),
          userId ? null : (input.guestPhone ?? null),
          input.paymentMethod,
        ],
      );
      const created = orderRows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, title, price_cents, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [created.id, item.id, item.title, item.price_cents, item.quantity],
        );
        await client.query(`UPDATE products SET stock = stock - $1 WHERE id = $2`, [item.quantity, item.id]);
      }

      return created;
    });

    await invalidate('products:list:*');
    emitToAdmins('order:created', { orderId: order.id, total_cents: order.total_cents });
    return order;
  },

  async getConfirmation(orderId: string): Promise<{
    id: string;
    status: OrderStatus;
    total_cents: number;
    shipping_address: string;
    delivery_method: DeliveryMethod;
    np_city_name: string | null;
    np_warehouse_name: string | null;
    recipient_name: string | null;
    ttn: string | null;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    created_at: string;
    items: OrderItem[];
  }> {
    const rows = await query<Order>('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = rows[0];
    if (!order) throw new NotFoundError('Order not found');
    const items = await query<OrderItem>('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    return {
      id: order.id,
      status: order.status,
      total_cents: order.total_cents,
      shipping_address: order.shipping_address,
      delivery_method: order.delivery_method,
      np_city_name: order.np_city_name,
      np_warehouse_name: order.np_warehouse_name,
      recipient_name: order.recipient_name ?? order.guest_name,
      ttn: order.ttn,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      created_at: order.created_at,
      items,
    };
  },

  async getForUser(orderId: string, userId: string, role: UserRole): Promise<Order & { items: OrderItem[] }> {
    const rows = await query<Order>('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = rows[0];
    if (!order) throw new NotFoundError('Order not found');
    if (role !== 'admin' && order.user_id !== userId) throw new ForbiddenError();

    const items = await query<OrderItem>('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    return { ...order, items };
  },

  async listForUser(userId: string, page: number, limit: number): Promise<{ items: Order[]; total: number }> {
    const offset = (page - 1) * limit;
    const items = await query<Order>(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    const countRows = await query<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1',
      [userId],
    );
    return { items, total: Number(countRows[0]?.count ?? 0) };
  },

  async listAll(page: number, limit: number): Promise<{ items: Order[]; total: number }> {
    const offset = (page - 1) * limit;
    const items = await query<Order>(`SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [
      limit,
      offset,
    ]);
    const countRows = await query<{ count: string }>('SELECT COUNT(*)::int AS count FROM orders');
    return { items, total: Number(countRows[0]?.count ?? 0) };
  },

  async updateStatus(orderId: string, next: OrderStatus): Promise<Order> {
    const rows = await query<Order>('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = rows[0];
    if (!order) throw new NotFoundError('Order not found');

    if (!allowedNext(order).includes(next)) {
      throw new BadRequestError(`Неможливий перехід статусу: ${order.status} → ${next}`);
    }

    const ttn = next === 'shipped' && !order.ttn ? generateTtn(orderId) : order.ttn;

    const paymentStatus =
      next === 'delivered' && order.payment_method === 'cod' ? 'paid' : order.payment_status;

    const updated = await query<Order>(
      `UPDATE orders SET status = $1, ttn = $2, payment_status = $3, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [next, ttn, paymentStatus, orderId],
    );

    if (order.user_id) emitToUser(order.user_id, 'order:status', { orderId, status: next, ttn });
    return updated[0];
  },
};
