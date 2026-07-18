import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.createTable('product_images', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    url: { type: 'text', notNull: true },
    position: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('product_images', ['product_id', 'position']);

  pgm.sql(`
    INSERT INTO product_images (product_id, url, position)
    SELECT id, image_url, 0 FROM products WHERE image_url IS NOT NULL
  `);

  pgm.createTable('wishlist_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('wishlist_items', 'wishlist_user_product_unique', {
    unique: ['user_id', 'product_id'],
  });
  pgm.createIndex('wishlist_items', 'user_id');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('wishlist_items');
  pgm.dropTable('product_images');
}
