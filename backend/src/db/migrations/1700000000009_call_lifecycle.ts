import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Життєвий цикл дзвінка.
 * Раніше оператор вручну вбивав напрямок, результат і тривалість. Тепер дзвінок
 * живе на сервері: створюється у стані «дзвонимо», а події від АТС (відповіли /
 * завершено / не відповіли) самі проставляють outcome і рахують тривалість.
 */
export function up(pgm: MigrationBuilder): void {
  pgm.createType('call_state', ['ringing', 'active', 'completed']);

  pgm.addColumns('call_logs', {
    // Ідентифікатор дзвінка на боці АТС — за ним приходять вебхуки.
    external_id: { type: 'text' },
    state: { type: 'call_state', notNull: true, default: 'completed' },
    started_at: { type: 'timestamptz' },
    answered_at: { type: 'timestamptz' }, // null = розмови не було
    ended_at: { type: 'timestamptz' },
  });

  // Вебхуки АТС приходять повторно — унікальність робить обробку ідемпотентною.
  pgm.addConstraint('call_logs', 'call_logs_external_id_unique', { unique: ['external_id'] });
  pgm.createIndex('call_logs', 'state');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropIndex('call_logs', 'state');
  pgm.dropConstraint('call_logs', 'call_logs_external_id_unique');
  pgm.dropColumns('call_logs', ['external_id', 'state', 'started_at', 'answered_at', 'ended_at']);
  pgm.dropType('call_state');
}
