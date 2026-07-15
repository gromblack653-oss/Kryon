import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  // --- Типи компонентів (GPU, БЖ, корпуси…) ---
  pgm.createTable('product_types', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    key: { type: 'text', notNull: true, unique: true },
    name: { type: 'text', notNull: true },
    icon: { type: 'text' },
    position: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Прив'язка товару до типу (спочатку всі — GPU, беклфіл у сідері).
  pgm.addColumn('products', {
    type_id: { type: 'uuid', references: 'product_types', onDelete: 'SET NULL' },
  });
  pgm.createIndex('products', 'type_id');

  // --- Визначення атрибутів (схема характеристик на тип) ---
  pgm.createType('attr_data_type', ['text', 'number', 'enum', 'bool']);
  pgm.createTable('attributes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    type_id: { type: 'uuid', notNull: true, references: 'product_types', onDelete: 'CASCADE' },
    key: { type: 'text', notNull: true },
    label: { type: 'text', notNull: true },
    unit: { type: 'text' },
    data_type: { type: 'attr_data_type', notNull: true, default: 'text' },
    is_filterable: { type: 'boolean', notNull: true, default: false },
    is_comparable: { type: 'boolean', notNull: true, default: true },
    position: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addConstraint('attributes', 'attributes_type_key_unique', { unique: ['type_id', 'key'] });

  // --- Значення атрибутів товару (EAV з типізованими колонками) ---
  pgm.createTable('product_attribute_values', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    product_id: { type: 'uuid', notNull: true, references: 'products', onDelete: 'CASCADE' },
    attribute_id: { type: 'uuid', notNull: true, references: 'attributes', onDelete: 'CASCADE' },
    value_text: { type: 'text' },
    value_num: { type: 'numeric' },
    value_bool: { type: 'boolean' },
  });
  pgm.addConstraint('product_attribute_values', 'pav_product_attr_unique', {
    unique: ['product_id', 'attribute_id'],
  });
  // Індекси під faceted-фільтри (attribute + значення).
  pgm.createIndex('product_attribute_values', ['attribute_id', 'value_num']);
  pgm.createIndex('product_attribute_values', ['attribute_id', 'value_text']);
  pgm.createIndex('product_attribute_values', 'product_id');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('product_attribute_values');
  pgm.dropTable('attributes');
  pgm.dropType('attr_data_type');
  pgm.dropColumn('products', 'type_id');
  pgm.dropTable('product_types');
}
