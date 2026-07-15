import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
  pgm.createExtension('citext', { ifNotExists: true });

  // --- users ---
  pgm.createType('user_role', ['admin', 'customer']);
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'citext', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    role: { type: 'user_role', notNull: true, default: 'customer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // --- categories ---
  pgm.createTable('categories', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    slug: { type: 'text', notNull: true, unique: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // --- products ---
  pgm.createTable('products', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    title: { type: 'text', notNull: true },
    slug: { type: 'text', notNull: true, unique: true },
    description: { type: 'text', notNull: true, default: '' },
    price_cents: { type: 'integer', notNull: true, check: 'price_cents >= 0' },
    stock: { type: 'integer', notNull: true, default: 0, check: 'stock >= 0' },
    image_url: { type: 'text' },
    category_id: {
      type: 'uuid',
      references: 'categories',
      onDelete: 'SET NULL',
    },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('products', 'category_id');
  pgm.createIndex('products', 'is_active');
  pgm.sql(`CREATE INDEX products_title_trgm ON products USING gin (to_tsvector('simple', title))`);

  // --- carts (один активний кошик на користувача) ---
  pgm.createTable('carts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('cart_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    cart_id: { type: 'uuid', notNull: true, references: 'carts', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    quantity: { type: 'integer', notNull: true, check: 'quantity > 0' },
  });
  pgm.addConstraint('cart_items', 'cart_items_unique_product', {
    unique: ['cart_id', 'product_id'],
  });

  // --- orders ---
  pgm.createType('order_status', ['pending', 'paid', 'shipped', 'delivered', 'cancelled']);
  pgm.createTable('orders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    status: { type: 'order_status', notNull: true, default: 'pending' },
    total_cents: { type: 'integer', notNull: true, check: 'total_cents >= 0' },
    shipping_address: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('orders', 'user_id');
  pgm.createIndex('orders', 'status');

  // Знімок ціни/назви на момент замовлення (історична цілісність).
  pgm.createTable('order_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    order_id: { type: 'uuid', notNull: true, references: 'orders', onDelete: 'CASCADE' },
    product_id: { type: 'uuid', references: 'products', onDelete: 'SET NULL' },
    title: { type: 'text', notNull: true },
    price_cents: { type: 'integer', notNull: true },
    quantity: { type: 'integer', notNull: true, check: 'quantity > 0' },
  });
  pgm.createIndex('order_items', 'order_id');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('order_items');
  pgm.dropTable('orders');
  pgm.dropType('order_status');
  pgm.dropTable('cart_items');
  pgm.dropTable('carts');
  pgm.dropTable('products');
  pgm.dropTable('categories');
  pgm.dropTable('users');
  pgm.dropType('user_role');
}
