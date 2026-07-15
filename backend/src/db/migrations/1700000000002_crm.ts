import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  // Телефон користувача (спільне поле для магазину/адмінки/CRM).
  pgm.addColumn('users', {
    phone: { type: 'text' },
  });

  // Нова роль для працівників CRM (окрім admin/customer).
  pgm.addTypeValue('user_role', 'agent', { ifNotExists: true });

  // --- Журнал дзвінків (MicroSIP та ін.) ---
  pgm.createType('call_direction', ['outbound', 'inbound']);
  pgm.createType('call_outcome', ['answered', 'no_answer', 'busy', 'voicemail', 'failed']);
  pgm.createTable('call_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    customer_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    agent_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    phone: { type: 'text', notNull: true },
    direction: { type: 'call_direction', notNull: true, default: 'outbound' },
    outcome: { type: 'call_outcome', notNull: true, default: 'answered' },
    duration_seconds: { type: 'integer', notNull: true, default: 0, check: 'duration_seconds >= 0' },
    note: { type: 'text', notNull: true, default: '' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('call_logs', 'customer_id');
  pgm.createIndex('call_logs', 'agent_id');
  pgm.createIndex('call_logs', 'created_at');

  // --- Нотатки / активності по клієнту ---
  pgm.createType('note_type', ['note', 'task', 'meeting', 'email']);
  pgm.createTable('customer_notes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    customer_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    agent_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    type: { type: 'note_type', notNull: true, default: 'note' },
    body: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('customer_notes', 'customer_id');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('customer_notes');
  pgm.dropType('note_type');
  pgm.dropTable('call_logs');
  pgm.dropType('call_outcome');
  pgm.dropType('call_direction');
  pgm.dropColumn('users', 'phone');
  // Значення enum 'agent' лишаємо (ALTER TYPE ... DROP VALUE не підтримується Postgres).
}
