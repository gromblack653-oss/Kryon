import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Доставка Новою Поштою + оплата.
 * - orders: спосіб доставки, відділення НП, отримувач, ТТН, спосіб і статус оплати.
 * - payments: транзакції платіжного шлюзу (одне замовлення може мати кілька спроб).
 */
export function up(pgm: MigrationBuilder): void {
  pgm.createType('delivery_method', ['np_warehouse', 'np_courier', 'pickup']);
  pgm.createType('payment_method', ['card', 'cod']); // cod — накладений платіж
  pgm.createType('payment_status', ['unpaid', 'pending', 'paid', 'failed', 'refunded']);

  pgm.addColumns('orders', {
    delivery_method: { type: 'delivery_method', notNull: true, default: 'np_warehouse' },
    // Довідник НП: ref — стабільний ідентифікатор, name зберігаємо для історії.
    np_city_ref: { type: 'text' },
    np_city_name: { type: 'text' },
    np_warehouse_ref: { type: 'text' },
    np_warehouse_name: { type: 'text' },
    recipient_name: { type: 'text' },
    recipient_phone: { type: 'text' },
    ttn: { type: 'text' }, // номер накладної НП, з'являється при відправленні
    payment_method: { type: 'payment_method', notNull: true, default: 'cod' },
    payment_status: { type: 'payment_status', notNull: true, default: 'unpaid' },
  });
  pgm.createIndex('orders', 'payment_status');

  pgm.createTable('payments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    order_id: { type: 'uuid', notNull: true, references: 'orders', onDelete: 'CASCADE' },
    provider: { type: 'text', notNull: true },
    // Ідентифікатор транзакції на боці шлюзу — за ним приходить вебхук.
    external_id: { type: 'text', notNull: true },
    amount_cents: { type: 'integer', notNull: true, check: 'amount_cents > 0' },
    status: { type: 'payment_status', notNull: true, default: 'pending' },
    raw: { type: 'jsonb' }, // остання відповідь шлюзу — для розборів
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  // Вебхук може прийти повторно — унікальність робить обробку ідемпотентною.
  pgm.addConstraint('payments', 'payments_external_id_unique', { unique: ['external_id'] });
  pgm.createIndex('payments', 'order_id');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('payments');
  pgm.dropIndex('orders', 'payment_status');
  pgm.dropColumns('orders', [
    'delivery_method', 'np_city_ref', 'np_city_name', 'np_warehouse_ref', 'np_warehouse_name',
    'recipient_name', 'recipient_phone', 'ttn', 'payment_method', 'payment_status',
  ]);
  pgm.dropType('payment_status');
  pgm.dropType('payment_method');
  pgm.dropType('delivery_method');
}
