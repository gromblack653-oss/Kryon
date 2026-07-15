import { pool } from '../../db/pool';
import type { BuildPart, PartType } from './compatibility';

/** Комплектуюча для збірки: товар + плоска мапа характеристик. */
export interface PartRow extends BuildPart {
  type: PartType;
  slug: string;
  stock: number;
  image_url: string | null;
}

/** Типи, які беруть участь у збірці ПК. */
const BUILDER_TYPES = ['cpu', 'mobo', 'ram', 'gpu', 'psu', 'case'];

/**
 * Товари типів збірки з характеристиками, зведеними в jsonb-мапу
 * (числа теж у текст — движок сумісності сам приводить типи).
 */
function partsSql(extraWhere = ''): string {
  return `
    SELECT p.id, p.title, p.slug, p.price_cents, p.stock, p.image_url, t.key AS type,
           COALESCE(
             jsonb_object_agg(
               a.key,
               COALESCE(pav.value_text, pav.value_num::text, pav.value_bool::text)
             ) FILTER (WHERE a.key IS NOT NULL),
             '{}'::jsonb
           ) AS attrs
      FROM products p
      JOIN product_types t ON t.id = p.type_id
      LEFT JOIN product_attribute_values pav ON pav.product_id = p.id
      LEFT JOIN attributes a ON a.id = pav.attribute_id
     WHERE t.key = ANY($1) ${extraWhere}
     GROUP BY p.id, t.key
  `;
}

/** Усі комплектуючі, згруповані за типом (для селекторів у збірці). */
export async function listParts(): Promise<Record<string, PartRow[]>> {
  const { rows } = await pool.query<PartRow>(`${partsSql()} ORDER BY p.price_cents DESC`, [BUILDER_TYPES]);
  const grouped: Record<string, PartRow[]> = {};
  for (const r of rows) (grouped[r.type] ??= []).push(r);
  return grouped;
}

/** Комплектуючі за списком id — щоб перевірити збірку на сервері. */
export async function findParts(ids: string[]): Promise<PartRow[]> {
  if (!ids.length) return [];
  const { rows } = await pool.query<PartRow>(partsSql('AND p.id = ANY($2)'), [BUILDER_TYPES, ids]);
  return rows;
}
