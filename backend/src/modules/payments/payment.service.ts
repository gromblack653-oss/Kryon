import crypto from 'crypto';
import { query, withTransaction } from '../../db/pool';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  order_id: string;
  provider: string;
  external_id: string;
  amount_cents: number;
  status: PaymentStatus;
  created_at: string;
}

export interface WebhookEvent {
  externalId: string;
  status: 'paid' | 'failed';
  amountCents: number;
}

export function signPayload(rawBody: string): string {
  return crypto.createHmac('sha256', env.payments.webhookSecret).update(rawBody).digest('hex');
}

export function verifySignature(rawBody: string, signature: string): boolean {
  const expected = signPayload(rawBody);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature ?? '', 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createSession(
  orderId: string,
  userId: string,
): Promise<{ paymentId: string; externalId: string; redirectUrl: string; amountCents: number }> {
  const orders = await query<{
    id: string;
    user_id: string;
    total_cents: number;
    payment_status: PaymentStatus;
  }>('SELECT id, user_id, total_cents, payment_status FROM orders WHERE id = $1', [orderId]);
  const order = orders[0];
  if (!order) throw new NotFoundError('Order not found');
  if (order.user_id !== userId) throw new NotFoundError('Order not found');
  if (order.payment_status === 'paid') throw new BadRequestError('Замовлення вже оплачене');

  const externalId = `${env.payments.provider}_${crypto.randomUUID()}`;

  const rows = await query<Payment>(
    `INSERT INTO payments (order_id, provider, external_id, amount_cents, status)
     VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
    [orderId, env.payments.provider, externalId, order.total_cents],
  );
  await query(`UPDATE orders SET payment_status = 'pending', updated_at = now() WHERE id = $1`, [orderId]);

  return {
    paymentId: rows[0].id,
    externalId,
    amountCents: order.total_cents,
    redirectUrl: `/payment/${externalId}`,
  };
}

export async function handleWebhook(event: WebhookEvent): Promise<{ applied: boolean }> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<Payment>('SELECT * FROM payments WHERE external_id = $1 FOR UPDATE', [
      event.externalId,
    ]);
    const payment = rows[0];
    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.status === 'paid' || payment.status === 'failed') {
      logger.info('Payment webhook ignored (already final)', {
        externalId: event.externalId,
        status: payment.status,
      });
      return { applied: false };
    }

    if (payment.amount_cents !== event.amountCents) {
      throw new BadRequestError('Сума платежу не збігається із замовленням');
    }

    await client.query(`UPDATE payments SET status = $1, raw = $2, updated_at = now() WHERE id = $3`, [
      event.status,
      JSON.stringify(event),
      payment.id,
    ]);

    if (event.status === 'paid') {
      await client.query(
        `UPDATE orders SET payment_status = 'paid', status = 'paid', updated_at = now() WHERE id = $1`,
        [payment.order_id],
      );
    } else {
      await client.query(`UPDATE orders SET payment_status = 'failed', updated_at = now() WHERE id = $1`, [
        payment.order_id,
      ]);
    }

    logger.info('Payment webhook applied', { externalId: event.externalId, status: event.status });
    return { applied: true };
  });
}

export async function mockGatewayComplete(
  externalId: string,
  outcome: 'paid' | 'failed',
): Promise<{ applied: boolean }> {
  const rows = await query<Payment>('SELECT * FROM payments WHERE external_id = $1', [externalId]);
  const payment = rows[0];
  if (!payment) throw new NotFoundError('Payment not found');

  const event: WebhookEvent = { externalId, status: outcome, amountCents: payment.amount_cents };
  const rawBody = JSON.stringify(event);
  const signature = signPayload(rawBody);

  if (!verifySignature(rawBody, signature)) throw new BadRequestError('Invalid signature');
  return handleWebhook(JSON.parse(rawBody) as WebhookEvent);
}

export async function findByExternalId(externalId: string): Promise<Payment | undefined> {
  const rows = await query<Payment>('SELECT * FROM payments WHERE external_id = $1', [externalId]);
  return rows[0];
}
