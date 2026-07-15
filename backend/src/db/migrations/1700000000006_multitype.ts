import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  // Які характеристики показувати чіпами на картці товару.
  pgm.addColumn('attributes', {
    show_on_card: { type: 'boolean', notNull: true, default: false },
  });

  // Категорії (серії/підгрупи) належать типу компонента.
  pgm.addColumn('categories', {
    type_id: { type: 'uuid', references: 'product_types', onDelete: 'CASCADE' },
  });
  pgm.createIndex('categories', 'type_id');
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropColumn('categories', 'type_id');
  pgm.dropColumn('attributes', 'show_on_card');
}
