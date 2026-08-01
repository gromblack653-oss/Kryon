import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.sql(`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM products
    )
    UPDATE products p
       SET old_price_cents = ROUND(p.price_cents * 1.22)::int
      FROM ranked
     WHERE ranked.id = p.id AND ranked.rn % 3 = 0 AND p.old_price_cents IS NULL
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql(`UPDATE products SET old_price_cents = NULL`);
}
