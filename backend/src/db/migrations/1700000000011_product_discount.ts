import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.addColumn('products', {
    old_price_cents: { type: 'integer' },
  });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropColumn('products', 'old_price_cents');
}
