import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.alterColumn('orders', 'user_id', { notNull: false });
  pgm.addColumns('orders', {
    guest_name: { type: 'text' },
    guest_email: { type: 'text' },
    guest_phone: { type: 'text' },
  });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropColumns('orders', ['guest_name', 'guest_email', 'guest_phone']);
  pgm.alterColumn('orders', 'user_id', { notNull: true });
}
