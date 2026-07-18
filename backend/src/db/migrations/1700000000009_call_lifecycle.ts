import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.createType('call_state', ['ringing', 'active', 'completed']);

  pgm.addColumns('call_logs', {
    external_id: { type: 'text' },
    state: { type: 'call_state', notNull: true, default: 'completed' },
    started_at: { type: 'timestamptz' },
    answered_at: { type: 'timestamptz' },
    ended_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('call_logs', 'call_logs_external_id_unique', { unique: ['external_id'] });
  pgm.createIndex('call_logs', 'state');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropIndex('call_logs', 'state');
  pgm.dropConstraint('call_logs', 'call_logs_external_id_unique');
  pgm.dropColumns('call_logs', ['external_id', 'state', 'started_at', 'answered_at', 'ended_at']);
  pgm.dropType('call_state');
}
