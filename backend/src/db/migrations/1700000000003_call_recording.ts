import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  // URL аудіозапису дзвінка (для прослуховування у CRM).
  pgm.addColumn('call_logs', {
    recording_url: { type: 'text' },
  });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropColumn('call_logs', 'recording_url');
}
