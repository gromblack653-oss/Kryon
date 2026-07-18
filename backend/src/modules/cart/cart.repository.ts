import { PoolClient } from 'pg';
import { pool, query } from '../../db/pool';

export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  slug: string;
  price_cents: number;
  quantity: number;
  stock: number;
  image_url: string | null;
  line_total_cents: number;
}

export interface CartView {
  items: CartItem[];
  total_cents: number;
}

/** Повертає id кошика користувача, створюючи його за потреби. */
export async function ensureCart(userId: string, client: PoolClient | null = null): Promise<string> {
  const runner = client ?? pool;
  const res = await runner.query<{ id: string }>(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING id`,
    [userId],
  );
  return res.rows[0].id;
}

export const cartRepository = {
  async view(userId: string): Promise<CartView> {
    const cartId = await ensureCart(userId);
    const items = await query<CartItem>(
      `SELECT ci.id, ci.product_id, p.title, p.slug, p.price_cents, ci.quantity,
              p.stock, p.image_url,
              (p.price_cents * ci.quantity) AS line_total_cents
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY p.title`,
      [cartId],
    );
    const total = items.reduce((sum, i) => sum + i.line_total_cents, 0);
    return { items, total_cents: total };
  },

  async addItem(userId: string, productId: string, quantity: number): Promise<void> {
    const cartId = await ensureCart(userId);
    await query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [cartId, productId, quantity],
    );
  },

  async setQuantity(userId: string, productId: string, quantity: number): Promise<void> {
    const cartId = await ensureCart(userId);
    await query(`UPDATE cart_items SET quantity = $3 WHERE cart_id = $1 AND product_id = $2`, [
      cartId,
      productId,
      quantity,
    ]);
  },

  async removeItem(userId: string, productId: string): Promise<void> {
    const cartId = await ensureCart(userId);
    await query(`DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2`, [cartId, productId]);
  },

  async clear(userId: string): Promise<void> {
    const cartId = await ensureCart(userId);
    await query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
  },
};
