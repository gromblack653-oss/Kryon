import crypto from 'crypto';
import { query, withTransaction } from '../../db/pool';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { emitToUser } from '../../realtime/io';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export type CallState = 'ringing' | 'active' | 'completed';
export type CallOutcome = 'answered' | 'no_answer' | 'busy' | 'voicemail' | 'failed';
export type CallDirection = 'inbound' | 'outbound';

export interface CallLog {
  id: string;
  external_id: string | null;
  customer_id: string | null;
  agent_id: string | null;
  phone: string;
  direction: CallDirection;
  outcome: CallOutcome;
  duration_seconds: number;
  note: string;
  state: CallState;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  recording_url: string | null;
  created_at: string;
}

/**
 * Подія від АТС. Такий самий набір дають Asterisk (AMI/ARI), Binotel, Zadarma:
 * дзвінок або підняли (answered), або він завершився з певної причини.
 */
export interface TelephonyEvent {
  externalId: string;
  event: 'answered' | 'completed' | 'no_answer' | 'busy' | 'failed';
  /** Тривалість розмови від АТС. Якщо не прийшла — рахуємо самі за мітками часу. */
  durationSeconds?: number;
  recordingUrl?: string;
  /** Вхідний дзвінок АТС може створити сама (дзвонять нам). */
  phone?: string;
  direction?: CallDirection;
}

/** Підпис вебхука — HMAC-SHA256 від сирого тіла, як у платіжного шлюзу. */
export function signPayload(rawBody: string): string {
  return crypto.createHmac('sha256', env.telephony.webhookSecret).update(rawBody).digest('hex');
}

export function verifySignature(rawBody: string, signature: string): boolean {
  const expected = signPayload(rawBody);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature ?? '', 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Подія завершення → результат дзвінка. Оператор більше нічого не обирає. */
const OUTCOME_BY_EVENT: Record<string, CallOutcome> = {
  no_answer: 'no_answer',
  busy: 'busy',
  failed: 'failed',
};

/**
 * Оператор натиснув «Подзвонити»: створюємо дзвінок у стані «дзвонимо».
 * Напрямок — вихідний (ініціював оператор), тривалість і результат
 * проставить АТС своїми подіями.
 */
export async function startCall(input: {
  agentId: string;
  customerId: string | null;
  phone: string;
}): Promise<CallLog> {
  const externalId = `${env.telephony.provider}_${crypto.randomUUID()}`;

  const rows = await query<CallLog>(
    `INSERT INTO call_logs (customer_id, agent_id, phone, direction, outcome,
                            duration_seconds, note, external_id, state, started_at)
     VALUES ($1, $2, $3, 'outbound', 'failed', 0, '', $4, 'ringing', now())
     RETURNING *`,
    [input.customerId, input.agentId, input.phone, externalId],
  );
  const call = rows[0];
  emitToUser(input.agentId, 'call:update', call);
  return call;
}

/**
 * Обробка події АТС. Ідемпотентна: завершений дзвінок повторна подія не змінює
 * (АТС ретраїть вебхуки, доки не отримає 200).
 */
export async function handleEvent(event: TelephonyEvent): Promise<{ applied: boolean; call?: CallLog }> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<CallLog>(
      'SELECT * FROM call_logs WHERE external_id = $1 FOR UPDATE',
      [event.externalId],
    );
    const call = rows[0];
    if (!call) throw new NotFoundError('Call not found');

    if (call.state === 'completed') {
      logger.info('Telephony webhook ignored (call already completed)', { externalId: event.externalId });
      return { applied: false, call };
    }

    let updated: CallLog;

    if (event.event === 'answered') {
      // Абонент підняв слухавку — з цього моменту йде розмова.
      const res = await client.query<CallLog>(
        `UPDATE call_logs SET state = 'active', answered_at = now(), outcome = 'answered'
         WHERE id = $1 RETURNING *`,
        [call.id],
      );
      updated = res.rows[0];
    } else {
      // Дзвінок завершився. Тривалість: беремо від АТС, інакше рахуємо самі —
      // від моменту відповіді до кінця (без розмови тривалість = 0).
      const outcome: CallOutcome =
        OUTCOME_BY_EVENT[event.event] ?? (call.answered_at ? 'answered' : 'no_answer');

      const res = await client.query<CallLog>(
        `UPDATE call_logs
            SET state = 'completed',
                ended_at = now(),
                outcome = $2,
                recording_url = COALESCE($3, recording_url),
                duration_seconds = COALESCE(
                  $4,
                  GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - answered_at)))::int),
                  0
                )
          WHERE id = $1
        RETURNING *`,
        [call.id, outcome, event.recordingUrl ?? null, event.durationSeconds ?? null],
      );
      updated = res.rows[0];
    }

    // Оператор бачить зміну наживо — без перезавантаження.
    if (updated.agent_id) emitToUser(updated.agent_id, 'call:update', updated);
    logger.info('Telephony event applied', { externalId: event.externalId, event: event.event });
    return { applied: true, call: updated };
  });
}

/**
 * Емулятор АТС для демо (TELEPHONY_PROVIDER=mock).
 * Формує підписану подію і проганяє її через ту саму перевірку, що й зовнішній
 * виклик, — тобто справжня АТС підставляється без змін у логіці вище.
 */
export async function mockPbxEvent(
  externalId: string,
  event: TelephonyEvent['event'],
): Promise<{ applied: boolean; call?: CallLog }> {
  const payload: TelephonyEvent = { externalId, event };
  // Демо-запис розмови додаємо лише до успішних дзвінків.
  if (event === 'completed') payload.recordingUrl = '/uploads/recordings/demo-call.mp3';

  const rawBody = JSON.stringify(payload);
  if (!verifySignature(rawBody, signPayload(rawBody))) throw new BadRequestError('Invalid signature');
  return handleEvent(JSON.parse(rawBody) as TelephonyEvent);
}

/** Дзвінок за id — для панелі активного дзвінка. */
export async function findCall(id: string): Promise<CallLog | undefined> {
  const rows = await query<CallLog>('SELECT * FROM call_logs WHERE id = $1', [id]);
  return rows[0];
}

/** Нотатка — єдине, що справді не автоматизується. */
export async function saveNote(id: string, note: string): Promise<CallLog> {
  const rows = await query<CallLog>(
    'UPDATE call_logs SET note = $2 WHERE id = $1 RETURNING *',
    [id, note],
  );
  if (!rows[0]) throw new NotFoundError('Call not found');
  return rows[0];
}
