import request from 'supertest';

jest.mock('../src/db/redis', () => ({
  redis: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
  connectRedis: jest.fn(),
  cached: (_k: string, _t: number, loader: () => unknown) => loader(),
  invalidate: jest.fn(),
}));

// Стан «БД» у памʼяті: один pending-платіж, який вебхук має перевести в paid.
const payment = {
  id: 'pay-1',
  order_id: 'order-1',
  provider: 'mock',
  external_id: 'mock_abc',
  amount_cents: 71094,
  status: 'pending' as string,
};
const orderUpdates: string[] = [];

jest.mock('../src/db/pool', () => ({
  pool: { query: jest.fn() },
  query: jest.fn(async (sql: string) => {
    if (sql.includes('FROM payments')) return payment.status === 'gone' ? [] : [payment];
    return [];
  }),
  withTransaction: jest.fn(async (fn: (c: unknown) => unknown) =>
    fn({
      query: async (sql: string, params: unknown[]) => {
        if (sql.includes('SELECT * FROM payments')) {
          return { rows: payment.status === 'gone' ? [] : [payment] };
        }
        if (sql.includes('UPDATE payments')) {
          payment.status = params[0] as string;
          return { rows: [] };
        }
        if (sql.includes('UPDATE orders')) {
          orderUpdates.push(sql);
          return { rows: [] };
        }
        return { rows: [] };
      },
    }),
  ),
}));

import { createApp } from '../src/app';
import { signPayload } from '../src/modules/payments/payment.service';

const app = createApp();

/** Відправляє подію так само, як це робив би справжній шлюз. */
const sendWebhook = (event: object, signature?: string) => {
  const rawBody = JSON.stringify(event);
  return request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Signature', signature ?? signPayload(rawBody))
    .send(rawBody);
};

describe('Вебхук платіжного шлюзу', () => {
  beforeEach(() => {
    payment.status = 'pending';
    orderUpdates.length = 0;
  });

  it('відхиляє подію з невірним підписом', async () => {
    const res = await sendWebhook(
      { externalId: 'mock_abc', status: 'paid', amountCents: 71094 },
      'deadbeef',
    );
    expect(res.status).toBe(400);
    expect(payment.status).toBe('pending'); // нічого не змінилось
  });

  it('відхиляє подію взагалі без підпису', async () => {
    const rawBody = JSON.stringify({ externalId: 'mock_abc', status: 'paid', amountCents: 71094 });
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(rawBody);
    expect(res.status).toBe(400);
  });

  it('успішна оплата переводить платіж і замовлення в paid', async () => {
    const res = await sendWebhook({ externalId: 'mock_abc', status: 'paid', amountCents: 71094 });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(true);
    expect(payment.status).toBe('paid');
    expect(orderUpdates.some((s) => s.includes("payment_status = 'paid'"))).toBe(true);
  });

  it('повторний вебхук нічого не змінює (ідемпотентність)', async () => {
    await sendWebhook({ externalId: 'mock_abc', status: 'paid', amountCents: 71094 });
    orderUpdates.length = 0;

    const res = await sendWebhook({ externalId: 'mock_abc', status: 'paid', amountCents: 71094 });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false); // подію проігноровано
    expect(orderUpdates).toHaveLength(0); // замовлення не чіпали вдруге
  });

  it('відхиляє подію з іншою сумою (захист від підміни)', async () => {
    const res = await sendWebhook({ externalId: 'mock_abc', status: 'paid', amountCents: 1 });
    expect(res.status).toBe(400);
    expect(payment.status).toBe('pending');
  });

  it('невдала оплата не робить замовлення оплаченим', async () => {
    const res = await sendWebhook({ externalId: 'mock_abc', status: 'failed', amountCents: 71094 });
    expect(res.status).toBe(200);
    expect(payment.status).toBe('failed');
    expect(orderUpdates.some((s) => s.includes("payment_status = 'failed'"))).toBe(true);
    expect(orderUpdates.some((s) => s.includes("status = 'paid'"))).toBe(false);
  });

  it('повертає 404 для невідомого платежу', async () => {
    payment.status = 'gone';
    const res = await sendWebhook({ externalId: 'mock_abc', status: 'paid', amountCents: 71094 });
    expect(res.status).toBe(404);
  });
});
