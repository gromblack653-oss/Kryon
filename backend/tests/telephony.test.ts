import request from 'supertest';

jest.mock('../src/db/redis', () => ({
  redis: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
  connectRedis: jest.fn(),
  cached: (_k: string, _t: number, loader: () => unknown) => loader(),
  invalidate: jest.fn(),
}));
jest.mock('../src/realtime/io', () => ({
  emitToUser: jest.fn(),
  emitToAdmins: jest.fn(),
  getIO: jest.fn(),
}));

// Дзвінок «у БД»: почався, слухавку ще не підняли.
const call = {
  id: 'call-1',
  external_id: 'mock_call_1',
  agent_id: 'agent-1',
  phone: '+380637778899',
  direction: 'outbound',
  outcome: 'failed',
  duration_seconds: 0,
  state: 'ringing' as string,
  answered_at: null as string | null,
};

jest.mock('../src/db/pool', () => ({
  pool: { query: jest.fn() },
  query: jest.fn(async () => [call]),
  withTransaction: jest.fn(async (fn: (c: unknown) => unknown) =>
    fn({
      query: async (sql: string, params: unknown[]) => {
        if (sql.includes('SELECT * FROM call_logs')) {
          return { rows: call.state === 'gone' ? [] : [call] };
        }
        if (sql.includes("state = 'active'")) {
          call.state = 'active';
          call.outcome = 'answered';
          call.answered_at = new Date().toISOString();
          return { rows: [call] };
        }
        if (sql.includes("state = 'completed'")) {
          call.state = 'completed';
          call.outcome = params[1] as string;
          // Тривалість рахує БД; у тесті імітуємо 12 с розмови, якщо її підняли.
          call.duration_seconds = call.answered_at ? 12 : 0;
          return { rows: [call] };
        }
        return { rows: [call] };
      },
    }),
  ),
}));

import { createApp } from '../src/app';
import { signPayload } from '../src/modules/crm/telephony.service';

const app = createApp();

const sendEvent = (event: object, signature?: string) => {
  const rawBody = JSON.stringify(event);
  return request(app)
    .post('/api/telephony/webhook')
    .set('Content-Type', 'application/json')
    .set('X-Signature', signature ?? signPayload(rawBody))
    .send(rawBody);
};

describe('Вебхук АТС', () => {
  beforeEach(() => {
    call.state = 'ringing';
    call.outcome = 'failed';
    call.duration_seconds = 0;
    call.answered_at = null;
  });

  it('відхиляє подію з невірним підписом', async () => {
    const res = await sendEvent({ externalId: 'mock_call_1', event: 'answered' }, 'deadbeef');
    expect(res.status).toBe(400);
    expect(call.state).toBe('ringing');
  });

  it('подія answered переводить дзвінок у розмову', async () => {
    const res = await sendEvent({ externalId: 'mock_call_1', event: 'answered' });
    expect(res.status).toBe(200);
    expect(call.state).toBe('active');
    expect(call.outcome).toBe('answered'); // результат проставився сам
    expect(call.answered_at).not.toBeNull();
  });

  it('після розмови результат і тривалість беруться автоматично', async () => {
    await sendEvent({ externalId: 'mock_call_1', event: 'answered' });
    const res = await sendEvent({ externalId: 'mock_call_1', event: 'completed' });

    expect(res.status).toBe(200);
    expect(call.state).toBe('completed');
    expect(call.outcome).toBe('answered');
    expect(call.duration_seconds).toBe(12); // порахував сервер, не оператор
  });

  it('без відповіді результат — no_answer, тривалість 0', async () => {
    const res = await sendEvent({ externalId: 'mock_call_1', event: 'no_answer' });
    expect(res.status).toBe(200);
    expect(call.outcome).toBe('no_answer');
    expect(call.duration_seconds).toBe(0);
  });

  it('зайнято — окремий результат', async () => {
    await sendEvent({ externalId: 'mock_call_1', event: 'busy' });
    expect(call.outcome).toBe('busy');
  });

  it('повторна подія від АТС нічого не змінює (ідемпотентність)', async () => {
    await sendEvent({ externalId: 'mock_call_1', event: 'answered' });
    await sendEvent({ externalId: 'mock_call_1', event: 'completed' });
    const duration = call.duration_seconds;

    const res = await sendEvent({ externalId: 'mock_call_1', event: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.applied).toBe(false);
    expect(call.duration_seconds).toBe(duration);
  });

  it('повертає 404 для невідомого дзвінка', async () => {
    call.state = 'gone';
    const res = await sendEvent({ externalId: 'mock_call_1', event: 'completed' });
    expect(res.status).toBe(404);
  });
});
