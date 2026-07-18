import { query } from '../../db/pool';

export interface CrmCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  orders_count: number;
  total_spent_cents: number;
  last_order_at: string | null;
  calls_count: number;
}

export interface CallLog {
  id: string;
  customer_id: string | null;
  agent_id: string | null;
  agent_name?: string | null;
  customer_name?: string | null;
  phone: string;
  direction: 'outbound' | 'inbound';
  outcome: 'answered' | 'no_answer' | 'busy' | 'voicemail' | 'failed';
  duration_seconds: number;
  note: string;
  recording_url: string | null;
  created_at: string;
}

export type CallSort = 'newest' | 'oldest' | 'outcome' | 'duration';

const CALL_SORT_SQL: Record<CallSort, string> = {
  newest: 'cl.created_at DESC',
  oldest: 'cl.created_at ASC',
  outcome: 'cl.outcome ASC, cl.created_at DESC',
  duration: 'cl.duration_seconds DESC',
};

export interface CustomerNote {
  id: string;
  customer_id: string;
  agent_id: string | null;
  agent_name?: string | null;
  type: 'note' | 'task' | 'meeting' | 'email';
  body: string;
  created_at: string;
}

export const crmRepository = {
  async listCustomers(search: string | undefined, page: number, limit: number) {
    const where: string[] = [`u.role = 'customer'`];
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.phone ILIKE $${params.length})`,
      );
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const countRows = await query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM users u ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const offset = (page - 1) * limit;
    params.push(limit, offset);
    const items = await query<CrmCustomer>(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              COUNT(DISTINCT o.id)::int AS orders_count,
              COALESCE(SUM(o.total_cents) FILTER (WHERE o.status IN ('paid','shipped','delivered')), 0)::bigint AS total_spent_cents,
              MAX(o.created_at) AS last_order_at,
              COUNT(DISTINCT cl.id)::int AS calls_count
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       LEFT JOIN call_logs cl ON cl.customer_id = u.id
       ${whereSql}
       GROUP BY u.id
       ORDER BY MAX(o.created_at) DESC NULLS LAST, u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getCustomer(id: string): Promise<CrmCustomer | null> {
    const rows = await query<CrmCustomer>(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              COUNT(DISTINCT o.id)::int AS orders_count,
              COALESCE(SUM(o.total_cents) FILTER (WHERE o.status IN ('paid','shipped','delivered')), 0)::bigint AS total_spent_cents,
              MAX(o.created_at) AS last_order_at,
              COUNT(DISTINCT cl.id)::int AS calls_count
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       LEFT JOIN call_logs cl ON cl.customer_id = u.id
       WHERE u.id = $1 AND u.role = 'customer'
       GROUP BY u.id`,
      [id],
    );
    return rows[0] ?? null;
  },

  async customerOrders(customerId: string) {
    return query(
      `SELECT id, status, total_cents, created_at, payment_method, payment_status, ttn FROM orders
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [customerId],
    );
  },

  /** Позиції замовлення (товари) — для перегляду складу замовлення в CRM. */
  async orderItems(orderId: string) {
    return query<{ id: string; title: string; price_cents: number; quantity: number }>(
      `SELECT id, title, price_cents, quantity FROM order_items WHERE order_id = $1 ORDER BY title`,
      [orderId],
    );
  },

  async updatePhone(customerId: string, phone: string | null) {
    await query(`UPDATE users SET phone = $1, updated_at = now() WHERE id = $2`, [phone, customerId]);
  },

  // --- Дзвінки ---
  async logCall(input: {
    customerId: string | null;
    agentId: string;
    phone: string;
    direction: string;
    outcome: string;
    durationSeconds: number;
    note: string;
  }): Promise<CallLog> {
    const rows = await query<CallLog>(
      `INSERT INTO call_logs (customer_id, agent_id, phone, direction, outcome, duration_seconds, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        input.customerId,
        input.agentId,
        input.phone,
        input.direction,
        input.outcome,
        input.durationSeconds,
        input.note,
      ],
    );
    return rows[0];
  },

  async customerCalls(customerId: string): Promise<CallLog[]> {
    return query<CallLog>(
      `SELECT cl.*, a.name AS agent_name
       FROM call_logs cl LEFT JOIN users a ON a.id = cl.agent_id
       WHERE cl.customer_id = $1 ORDER BY cl.created_at DESC`,
      [customerId],
    );
  },

  async recentCalls(limit: number, sort: CallSort = 'newest'): Promise<CallLog[]> {
    return query<CallLog>(
      `SELECT cl.*, a.name AS agent_name, c.name AS customer_name
       FROM call_logs cl
       LEFT JOIN users a ON a.id = cl.agent_id
       LEFT JOIN users c ON c.id = cl.customer_id
       ORDER BY ${CALL_SORT_SQL[sort]} LIMIT $1`,
      [limit],
    );
  },

  async setRecording(callId: string, url: string): Promise<CallLog | null> {
    const rows = await query<CallLog>(`UPDATE call_logs SET recording_url = $1 WHERE id = $2 RETURNING *`, [
      url,
      callId,
    ]);
    return rows[0] ?? null;
  },

  // --- Нотатки ---
  async addNote(input: {
    customerId: string;
    agentId: string;
    type: string;
    body: string;
  }): Promise<CustomerNote> {
    const rows = await query<CustomerNote>(
      `INSERT INTO customer_notes (customer_id, agent_id, type, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.customerId, input.agentId, input.type, input.body],
    );
    return rows[0];
  },

  async customerNotes(customerId: string): Promise<CustomerNote[]> {
    return query<CustomerNote>(
      `SELECT n.*, a.name AS agent_name
       FROM customer_notes n LEFT JOIN users a ON a.id = n.agent_id
       WHERE n.customer_id = $1 ORDER BY n.created_at DESC`,
      [customerId],
    );
  },

  // --- Статистика дашборду ---
  async stats(agentId: string) {
    const [totals] = await query<{ customers: number; calls_today: number; my_calls_today: number }>(
      `SELECT
        (SELECT COUNT(*)::int FROM users WHERE role = 'customer') AS customers,
        (SELECT COUNT(*)::int FROM call_logs WHERE created_at::date = now()::date) AS calls_today,
        (SELECT COUNT(*)::int FROM call_logs WHERE created_at::date = now()::date AND agent_id = $1) AS my_calls_today`,
      [agentId],
    );
    const byOutcome = await query<{ outcome: string; count: number }>(
      `SELECT outcome, COUNT(*)::int AS count FROM call_logs GROUP BY outcome`,
    );

    // Черга на обдзвін: клієнти з незакритими замовленнями (очікують оплати або
    // оплачені, але ще не відправлені), яким сьогодні ще не дзвонили.
    // Спершу найдорожчі замовлення — оператор бачить, з кого починати день.
    const needsCall = await query<{
      id: string;
      name: string;
      phone: string | null;
      orders_count: number;
      total_spent_cents: string;
    }>(
      `SELECT u.id, u.name, u.phone,
              COUNT(o.id)::int AS orders_count,
              COALESCE(SUM(o.total_cents), 0)::bigint AS total_spent_cents
         FROM users u
         JOIN orders o ON o.user_id = u.id AND o.status IN ('pending', 'paid')
        WHERE u.role = 'customer'
          AND NOT EXISTS (
                SELECT 1 FROM call_logs c
                 WHERE c.customer_id = u.id
                   AND c.created_at::date = now()::date
              )
        GROUP BY u.id, u.name, u.phone
        ORDER BY total_spent_cents DESC
        LIMIT 5`,
    );

    return {
      customers: totals?.customers ?? 0,
      callsToday: totals?.calls_today ?? 0,
      myCallsToday: totals?.my_calls_today ?? 0,
      callsByOutcome: Object.fromEntries(byOutcome.map((r) => [r.outcome, r.count])),
      needsCall: needsCall.map((c) => ({ ...c, total_spent_cents: Number(c.total_spent_cents) })),
    };
  },
};
