import { query } from '../../db/pool';
import { ListProductsQuery, CreateProductInput, UpdateProductInput } from './product.schemas';

export interface ProductAttribute {
  key: string;
  label: string;
  unit: string | null;
  data_type: 'text' | 'number' | 'enum' | 'bool';
  value: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price_cents: number;
  stock: number;
  image_url: string | null;
  category_id: string | null;
  category_name?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  type_key?: string | null;
  type_name?: string | null;
  rating_avg?: number | null;
  rating_count?: number;
  specs?: ProductSpec[];
  attributes?: ProductAttribute[];
  images?: ProductImage[];
}

export interface ProductSpec {
  key: string;
  label: string;
  unit: string | null;
  value: string;
}

export interface ProductType {
  key: string;
  name: string;
  icon: string | null;
  count: number;
}

export interface Facet {
  key: string;
  label: string;
  unit: string | null;
  data_type: string;
  options: Array<{ value: string; count: number }>;
}

export interface ProductImage {
  id: string;
  url: string;
  position: number;
}

export interface PagedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const SORT_SQL: Record<ListProductsQuery['sort'], string> = {
  newest: 'p.created_at DESC',
  price_asc: 'p.price_cents ASC',
  price_desc: 'p.price_cents DESC',
  title: 'p.title ASC',
  rating: 'rating_avg DESC NULLS LAST, rating_count DESC',
};

const RATING_COLS = `
  (SELECT ROUND(AVG(r.rating)::numeric, 1)::float8 FROM reviews r WHERE r.product_id = p.id) AS rating_avg,
  (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id)::int AS rating_count`;

async function attachSpecs(items: Product[]): Promise<void> {
  if (!items.length) return;
  const ids = items.map((i) => i.id);
  const rows = await query<ProductSpec & { product_id: string }>(
    `SELECT pav.product_id, a.key, a.label, a.unit,
            COALESCE(pav.value_text, pav.value_num::text) AS value
     FROM product_attribute_values pav
     JOIN attributes a ON a.id = pav.attribute_id
     WHERE pav.product_id = ANY($1) AND a.show_on_card
     ORDER BY a.position`,
    [ids],
  );
  const byProduct: Record<string, ProductSpec[]> = {};
  for (const r of rows) {
    (byProduct[r.product_id] ??= []).push({ key: r.key, label: r.label, unit: r.unit, value: r.value });
  }
  for (const item of items) item.specs = byProduct[item.id] ?? [];
}

async function getAttributes(productId: string): Promise<ProductAttribute[]> {
  return query<ProductAttribute>(
    `SELECT a.key, a.label, a.unit, a.data_type,
            COALESCE(pav.value_text, pav.value_num::text, pav.value_bool::text) AS value
     FROM product_attribute_values pav
     JOIN attributes a ON a.id = pav.attribute_id
     WHERE pav.product_id = $1
     ORDER BY a.position`,
    [productId],
  );
}

async function getImages(productId: string): Promise<ProductImage[]> {
  return query<ProductImage>(
    `SELECT id, url, position FROM product_images
     WHERE product_id = $1 ORDER BY position, created_at`,
    [productId],
  );
}

type FilterInput = Pick<
  ListProductsQuery,
  'search' | 'type' | 'category' | 'minPrice' | 'maxPrice' | 'inStock' | 'attrs'
>;

function baseFilters(q: FilterInput, params: unknown[]): string[] {
  const where = ['p.is_active = true'];
  if (q.search) {
    for (const word of q.search.split(/\s+/).filter(Boolean).slice(0, 6)) {
      params.push(`%${word}%`);
      where.push(`(p.title ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }
  }
  if (q.type) {
    params.push(q.type);
    where.push(`t.key = $${params.length}`);
  }
  if (q.category) {
    params.push(q.category);
    where.push(`c.slug = $${params.length}`);
  }
  if (q.minPrice !== undefined) {
    params.push(q.minPrice * 100);
    where.push(`p.price_cents >= $${params.length}`);
  }
  if (q.maxPrice !== undefined) {
    params.push(q.maxPrice * 100);
    where.push(`p.price_cents <= $${params.length}`);
  }
  if (q.inStock) where.push('p.stock > 0');
  return where;
}

function parseAttrs(attrs?: string): Array<{ key: string; values: string[] }> {
  if (!attrs) return [];
  return attrs
    .split(';')
    .map((group) => {
      const [key, raw] = group.split(':');
      const values = (raw ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      return { key: (key ?? '').trim(), values };
    })
    .filter((g) => g.key && g.values.length)
    .slice(0, 10);
}

function attrFilters(q: FilterInput, params: unknown[]): string[] {
  const where: string[] = [];
  for (const { key, values } of parseAttrs(q.attrs)) {
    params.push(key);
    const keyIdx = params.length;
    params.push(values);
    const valIdx = params.length;
    where.push(
      `EXISTS (
         SELECT 1 FROM product_attribute_values pav
         JOIN attributes a ON a.id = pav.attribute_id
         WHERE pav.product_id = p.id AND a.key = $${keyIdx}
           AND COALESCE(pav.value_text, pav.value_num::text) = ANY($${valIdx})
       )`,
    );
  }
  return where;
}

const PRODUCT_JOINS = `
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN product_types t ON t.id = p.type_id`;

export const productRepository = {
  async list(q: ListProductsQuery): Promise<PagedProducts> {
    const params: unknown[] = [];
    const where = [...baseFilters(q, params), ...attrFilters(q, params)];
    const whereSql = `WHERE ${where.join(' AND ')}`;

    const countRows = await query<{ count: string }>(
      `SELECT COUNT(*)::int AS count ${PRODUCT_JOINS} ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const offset = (q.page - 1) * q.limit;
    params.push(q.limit, offset);

    const items = await query<Product>(
      `SELECT p.*, c.name AS category_name, t.key AS type_key, t.name AS type_name,
              ${RATING_COLS}
       ${PRODUCT_JOINS}
       ${whereSql}
       ORDER BY ${SORT_SQL[q.sort]}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    await attachSpecs(items);
    return { items, total, page: q.page, limit: q.limit, pages: Math.ceil(total / q.limit) };
  },

  async listTypes(): Promise<ProductType[]> {
    return query<ProductType>(
      `SELECT t.key, t.name, t.icon, COUNT(p.id) FILTER (WHERE p.is_active)::int AS count
       FROM product_types t
       LEFT JOIN products p ON p.type_id = t.id
       GROUP BY t.id
       ORDER BY t.position`,
    );
  },

  async facets(q: FilterInput): Promise<Facet[]> {
    const params: unknown[] = [];
    const where = baseFilters(q, params);

    const rows = await query<{
      key: string;
      label: string;
      unit: string | null;
      data_type: string;
      position: number;
      value: string;
      sort_num: number | null;
      count: number;
    }>(
      `SELECT a.key, a.label, a.unit, a.data_type, a.position,
              COALESCE(pav.value_text, pav.value_num::text) AS value,
              pav.value_num AS sort_num,
              COUNT(DISTINCT p.id)::int AS count
       ${PRODUCT_JOINS}
       JOIN product_attribute_values pav ON pav.product_id = p.id
       JOIN attributes a ON a.id = pav.attribute_id AND a.is_filterable
       WHERE ${where.join(' AND ')}
       GROUP BY a.key, a.label, a.unit, a.data_type, a.position, value, pav.value_num
       ORDER BY a.position, pav.value_num NULLS LAST, value`,
      params,
    );

    const byKey = new Map<string, Facet>();
    for (const r of rows) {
      if (!byKey.has(r.key)) {
        byKey.set(r.key, { key: r.key, label: r.label, unit: r.unit, data_type: r.data_type, options: [] });
      }
      byKey.get(r.key)!.options.push({ value: r.value, count: r.count });
    }
    return [...byKey.values()];
  },

  async addImage(productId: string, url: string): Promise<ProductImage[]> {
    await query(
      `INSERT INTO product_images (product_id, url, position)
       VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM product_images WHERE product_id = $1), 0))`,
      [productId, url],
    );
    await query(`UPDATE products SET image_url = $1 WHERE id = $2 AND image_url IS NULL`, [url, productId]);
    return getImages(productId);
  },

  async removeImage(productId: string, imageId: string): Promise<ProductImage[]> {
    await query(`DELETE FROM product_images WHERE id = $1 AND product_id = $2`, [imageId, productId]);
    const rest = await getImages(productId);
    await query(`UPDATE products SET image_url = $1 WHERE id = $2`, [rest[0]?.url ?? null, productId]);
    return rest;
  },

  async compareByIds(ids: string[]): Promise<Product[]> {
    const out: Product[] = [];
    for (const id of ids.slice(0, 4)) {
      const product = await productRepository.findById(id);
      if (product) out.push(product);
    }
    return out;
  },

  async findById(id: string): Promise<Product | null> {
    const rows = await query<Product>(
      `SELECT p.*, c.name AS category_name, t.key AS type_key, t.name AS type_name,
              ${RATING_COLS}
       ${PRODUCT_JOINS}
       WHERE p.id = $1`,
      [id],
    );
    const product = rows[0] ?? null;
    if (product) {
      [product.attributes, product.images] = await Promise.all([
        getAttributes(product.id),
        getImages(product.id),
      ]);
    }
    return product;
  },

  async create(input: CreateProductInput): Promise<Product> {
    const rows = await query<Product>(
      `INSERT INTO products (title, slug, description, price_cents, stock, category_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.title, input.slug, input.description, input.price, input.stock, input.categoryId ?? null],
    );
    return rows[0];
  },

  async update(id: string, input: UpdateProductInput): Promise<Product | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, unknown> = {
      title: input.title,
      slug: input.slug,
      description: input.description,
      price_cents: input.price,
      stock: input.stock,
      category_id: input.categoryId,
      is_active: input.isActive,
    };
    for (const [col, value] of Object.entries(map)) {
      if (value !== undefined) {
        params.push(value);
        fields.push(`${col} = $${params.length}`);
      }
    }
    if (!fields.length) return this.findById(id);

    params.push(id);
    const rows = await query<Product>(
      `UPDATE products SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  },

  async setImage(id: string, imageUrl: string): Promise<Product | null> {
    const rows = await query<Product>(
      `UPDATE products SET image_url = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [imageUrl, id],
    );
    return rows[0] ?? null;
  },

  async remove(id: string): Promise<boolean> {
    const rows = await query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
    return rows.length > 0;
  },
};
