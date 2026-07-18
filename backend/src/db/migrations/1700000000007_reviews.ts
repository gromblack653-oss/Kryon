import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.createTable('reviews', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    rating: { type: 'integer', notNull: true, check: 'rating BETWEEN 1 AND 5' },
    body: { type: 'text', notNull: true, default: '' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('reviews', 'reviews_product_user_unique', { unique: ['product_id', 'user_id'] });
  pgm.createIndex('reviews', 'product_id');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('reviews');
}
