import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { pool, withTransaction } from './pool';
import { redis, connectRedis, invalidate } from './redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import {
  categories,
  products,
  extraCustomers,
  demoOrders,
  agentUser,
  defaultCustomerPhone,
  demoCalls,
  demoNotes,
  demoReviews,
  gpuType,
  gpuAttributes,
} from './seed.data';
import { componentTypes, componentProducts } from './seed.components';
import { componentImages } from './seed.components-images';
import { productImages, extraProductImages } from './seed.images';
import { gpuPower } from './seed.gpu-power';

/**
 * Наповнює БД каталогом відеокарт Kryon.
 *
 * Сідер приводить каталог до відомого стану: очищає старі товари/категорії/замовлення
 * (користувачі зберігаються) і вставляє актуальний асортимент + демо-замовлення.
 * Безпечно запускати повторно — щоразу отримуєте однаковий чистий каталог.
 */
async function seed(): Promise<void> {
  await withTransaction(async (client) => {
    await resetCatalog(client);
    await seedUsers(client);
    const types = await seedTypes(client);
    const catBySlug = await seedCategories(client, types.ids.gpu);
    const prodBySlug = await seedProducts(client, catBySlug, types);
    await seedComponents(client, types);
    await seedReviews(client);
    await seedDemoOrders(client, prodBySlug);
    await seedCrm(client);
  });

  // Товари отримали нові id — інакше Redis віддаватиме застарілий каталог.
  await clearCatalogCache();

  logger.info('Seed completed', {
    products: products.length + componentProducts.length,
    categories: categories.length,
  });
}

/** Скидає кеш каталогу в Redis (без Redis — просто попереджає). */
async function clearCatalogCache(): Promise<void> {
  try {
    await connectRedis();
    // Даємо клієнту мить на встановлення зʼєднання.
    for (let i = 0; i < 20 && !redis.isReady; i++) await new Promise((r) => setTimeout(r, 100));
    if (!redis.isReady) throw new Error('Redis не готовий');
    await invalidate('products:list:*');
    await redis.quit();
    logger.info('Catalog cache cleared');
  } catch (err) {
    logger.warn('Не вдалося скинути кеш каталогу (Redis недоступний)', { error: String(err) });
  }
}

/** Прибирає старий каталог, замовлення та CRM-дані (users лишаються). */
async function resetCatalog(client: PoolClient): Promise<void> {
  await client.query('DELETE FROM call_logs');
  await client.query('DELETE FROM customer_notes');
  await client.query('DELETE FROM cart_items');
  await client.query('DELETE FROM order_items');
  await client.query('DELETE FROM orders');
  await client.query('DELETE FROM products');
  await client.query('DELETE FROM categories');
  // product_types → CASCADE прибирає attributes та product_attribute_values.
  await client.query('DELETE FROM product_types');
}

/** Визначає бренд відеокарти за назвою. */
function detectBrand(title: string): string | null {
  if (/nvidia|geforce|rtx|gtx/i.test(title)) return 'NVIDIA';
  if (/radeon|amd|\brx\b/i.test(title)) return 'AMD';
  if (/intel|\barc\b/i.test(title)) return 'Intel';
  return null;
}

/** Витягує характеристики відеокарти з назви та опису. */
function parseGpuSpecs(title: string, desc: string): Record<string, string | number> {
  const specs: Record<string, string | number> = {};
  const brand = detectBrand(title);
  if (brand) specs.brand = brand;

  const mem = desc.match(/(\d+)\s*ГБ\s+(GDDR\d\w*)/i);
  if (mem) {
    specs.vram_gb = Number(mem[1]);
    specs.memory_type = mem[2].toUpperCase();
  }
  const bus = desc.match(/(\d+)\s*-?\s*біт/i);
  if (bus) specs.bus_bits = Number(bus[1]);

  const year = desc.match(/(20\d{2})\s*рок/i);
  if (year) specs.release_year = Number(year[1]);

  return specs;
}

async function seedUsers(client: PoolClient): Promise<void> {
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const userHash = await bcrypt.hash('User123!', 10);
  const agentHash = await bcrypt.hash('Agent123!', 10);

  // admin + стандартний покупець (із телефоном) + працівник CRM.
  await client.query(
    `INSERT INTO users (email, password_hash, name, role, phone)
     VALUES ($1, $2, 'Адміністратор', 'admin', NULL),
            ($3, $4, 'Тестовий покупець', 'customer', $5),
            ($6, $7, $8, 'agent', NULL)
     ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone`,
    [
      'admin@kryon.ua',
      adminHash,
      'user@kryon.ua',
      userHash,
      defaultCustomerPhone,
      agentUser.email,
      agentHash,
      agentUser.name,
    ],
  );
  for (const c of extraCustomers) {
    await client.query(
      `INSERT INTO users (email, password_hash, name, role, phone)
       VALUES ($1, $2, $3, 'customer', $4)
       ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone`,
      [c.email, userHash, c.name, c.phone],
    );
  }
}

/** Мапа типів та їхніх атрибутів, зібрана під час сідування. */
interface SeededTypes {
  ids: Record<string, string>; // typeKey → type id
  attrs: Record<string, Record<string, { id: string; dataType: string }>>; // typeKey → attrKey → def
}

/** Створює всі типи компонентів та їхні схеми характеристик. */
async function seedTypes(client: PoolClient): Promise<SeededTypes> {
  const ids: SeededTypes['ids'] = {};
  const attrs: SeededTypes['attrs'] = {};

  const allTypes = [{ ...gpuType, attributes: gpuAttributes }, ...componentTypes];

  for (const t of allTypes) {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO product_types (key, name, icon, position) VALUES ($1, $2, $3, $4) RETURNING id`,
      [t.key, t.name, t.icon, t.position],
    );
    ids[t.key] = rows[0].id;
    attrs[t.key] = {};

    for (const a of t.attributes) {
      const { rows: ar } = await client.query<{ id: string }>(
        `INSERT INTO attributes (type_id, key, label, unit, data_type, is_filterable, show_on_card, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          ids[t.key],
          a.key,
          a.label,
          a.unit ?? null,
          a.dataType,
          a.filterable,
          a.showOnCard ?? false,
          a.position,
        ],
      );
      attrs[t.key][a.key] = { id: ar[0].id, dataType: a.dataType };
    }
  }
  logger.info('Product types seeded', { types: allTypes.length });
  return { ids, attrs };
}

/** Вставляє значення характеристик товару. */
async function insertAttrValues(
  client: PoolClient,
  productId: string,
  typeKey: string,
  types: SeededTypes,
  values: Record<string, string | number>,
): Promise<number> {
  let count = 0;
  for (const [key, value] of Object.entries(values)) {
    const attr = types.attrs[typeKey]?.[key];
    if (!attr) continue;
    const isNum = attr.dataType === 'number';
    await client.query(
      `INSERT INTO product_attribute_values (product_id, attribute_id, value_text, value_num)
       VALUES ($1, $2, $3, $4)`,
      [productId, attr.id, isNum ? null : String(value), isNum ? Number(value) : null],
    );
    count++;
  }
  return count;
}

async function seedCategories(client: PoolClient, gpuTypeId: string): Promise<Record<string, string>> {
  // Серії відеокарт належать типу «Відеокарти».
  for (const c of categories) {
    await client.query('INSERT INTO categories (name, slug, type_id) VALUES ($1, $2, $3)', [
      c.name,
      c.slug,
      gpuTypeId,
    ]);
  }
  const { rows } = await client.query<{ id: string; slug: string }>('SELECT id, slug FROM categories');
  return Object.fromEntries(rows.map((r) => [r.slug, r.id]));
}

/** Товари інших типів компонентів (CPU, RAM, БЖ, корпуси) з явними характеристиками. */
async function seedComponents(client: PoolClient, types: SeededTypes): Promise<void> {
  let values = 0;
  for (const p of componentProducts) {
    const image = componentImages[p.slug] ?? null;
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO products (title, slug, description, price_cents, stock, type_id, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [p.title, p.slug, p.desc, p.price, p.stock, types.ids[p.type], image],
    );
    values += await insertAttrValues(client, rows[0].id, p.type, types, p.attrs);
    if (image) {
      await client.query(`INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, 0)`, [
        rows[0].id,
        image,
      ]);
    }
  }
  logger.info('Component products seeded', { products: componentProducts.length, values });
}

async function seedProducts(
  client: PoolClient,
  catBySlug: Record<string, string>,
  types: SeededTypes,
): Promise<Record<string, { id: string; title: string; price: number }>> {
  const map: Record<string, { id: string; title: string; price: number }> = {};
  let attrValues = 0;
  for (const p of products) {
    const image = productImages[p.slug] ?? null;
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO products (title, slug, description, price_cents, stock, category_id, image_url, type_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [p.title, p.slug, p.desc, p.price, p.stock, catBySlug[p.cat], image, types.ids.gpu],
    );
    map[p.slug] = { id: rows[0].id, title: p.title, price: p.price };

    // Характеристики відеокарти розпарсені з назви та опису.
    // TDP і довжина — з довідника (потрібні PC Builder).
    const power = gpuPower[p.slug];
    attrValues += await insertAttrValues(client, rows[0].id, 'gpu', types, {
      ...parseGpuSpecs(p.title, p.desc),
      ...(power ? { tdp: power.tdp, length_mm: power.length } : {}),
    });

    // Обкладинка стає першим фото галереї, далі — додаткові ракурси.
    if (image) {
      await client.query(`INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, 0)`, [
        rows[0].id,
        image,
      ]);
    }
    const extras = extraProductImages[p.slug] ?? [];
    for (const [i, url] of extras.entries()) {
      await client.query(`INSERT INTO product_images (product_id, url, position) VALUES ($1, $2, $3)`, [
        rows[0].id,
        url,
        i + 1,
      ]);
    }
  }
  logger.info('GPU products seeded', { products: products.length, attrValues });
  return map;
}

/** Демо-відгуки з оцінками (за slug товару та індексом покупця). */
async function seedReviews(client: PoolClient): Promise<void> {
  const { rows: customers } = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'customer' ORDER BY created_at`,
  );
  const { rows: prods } = await client.query<{ id: string; slug: string }>('SELECT id, slug FROM products');
  const idBySlug = Object.fromEntries(prods.map((p) => [p.slug, p.id]));
  if (!customers.length) return;

  let count = 0;
  for (const r of demoReviews) {
    const productId = idBySlug[r.slug];
    if (!productId) continue;
    const user = customers[r.customerIdx % customers.length];
    await client.query(
      `INSERT INTO reviews (product_id, user_id, rating, body) VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, user_id) DO NOTHING`,
      [productId, user.id, r.rating, r.body],
    );
    count++;
  }
  logger.info('Reviews seeded', { reviews: count });
}

/** Створює демонстраційні замовлення різних статусів (за slug товарів). */
async function seedDemoOrders(
  client: PoolClient,
  prodBySlug: Record<string, { id: string; title: string; price: number }>,
): Promise<void> {
  const { rows: customers } = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'customer' ORDER BY created_at`,
  );
  if (!customers.length) return;

  for (const order of demoOrders) {
    const user = customers[order.customerIdx % customers.length];
    const lines = order.lines.map((l) => ({ p: prodBySlug[l.slug], qty: l.qty })).filter((l) => l.p);
    if (!lines.length) continue;

    const total = lines.reduce((sum, l) => sum + l.p.price * l.qty, 0);
    const { rows: created } = await client.query<{ id: string }>(
      `INSERT INTO orders (user_id, status, total_cents, shipping_address)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [user.id, order.status, total, 'Київ, Нова Пошта, відділення №25'],
    );
    const orderId = created[0].id;

    for (const l of lines) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, title, price_cents, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, l.p.id, l.p.title, l.p.price, l.qty],
      );
    }
  }
  logger.info('Demo orders seeded', { count: demoOrders.length });
}

/**
 * Створює короткий WAV-файл (тон) у теці uploads як демонстраційний
 * аудіозапис дзвінка, щоб функція прослуховування працювала «з коробки».
 * Повертає публічний URL або null у разі помилки запису.
 */
function writeDemoRecording(): string | null {
  try {
    const uploadDir = path.resolve(process.cwd(), env.upload.dir);
    fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, 'demo-call.wav');

    const sampleRate = 8000;
    const seconds = 3;
    const numSamples = sampleRate * seconds;
    const data = Buffer.alloc(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Легка мелодія з двох тонів + плавне затухання — «звучить» як запис.
      const tone = Math.sin(2 * Math.PI * 440 * t) * 0.3 + Math.sin(2 * Math.PI * 660 * t) * 0.2;
      const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.5 * t);
      data.writeInt16LE(Math.round(tone * envelope * 32767), i * 2);
    }

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // PCM chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(1, 22); // mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28); // byte rate
    header.writeUInt16LE(2, 32); // block align
    header.writeUInt16LE(16, 34); // bits per sample
    header.write('data', 36);
    header.writeUInt32LE(data.length, 40);

    fs.writeFileSync(filePath, Buffer.concat([header, data]));
    return `/${env.upload.dir}/demo-call.wav`;
  } catch (err) {
    logger.warn('Не вдалося створити демо-запис дзвінка', { error: String(err) });
    return null;
  }
}

/** Демо-дані CRM: дзвінки та нотатки по клієнтах. */
async function seedCrm(client: PoolClient): Promise<void> {
  const { rows: customers } = await client.query<{ id: string; phone: string | null }>(
    `SELECT id, phone FROM users WHERE role = 'customer' ORDER BY created_at`,
  );
  const { rows: agents } = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'agent' ORDER BY created_at LIMIT 1`,
  );
  if (!customers.length || !agents.length) return;
  const agentId = agents[0].id;
  const recordingUrl = writeDemoRecording();

  for (const call of demoCalls) {
    const cust = customers[call.customerIdx % customers.length];
    await client.query(
      `INSERT INTO call_logs (customer_id, agent_id, phone, direction, outcome, duration_seconds, note, recording_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        cust.id,
        agentId,
        cust.phone ?? '+380000000000',
        call.direction,
        call.outcome,
        call.durationSeconds,
        call.note,
        call.recording ? recordingUrl : null,
      ],
    );
  }

  for (const note of demoNotes) {
    const cust = customers[note.customerIdx % customers.length];
    await client.query(
      `INSERT INTO customer_notes (customer_id, agent_id, type, body)
       VALUES ($1, $2, $3, $4)`,
      [cust.id, agentId, note.type, note.body],
    );
  }
  logger.info('CRM demo data seeded', { calls: demoCalls.length, notes: demoNotes.length });
}

seed()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Seed failed', { error: String(err) });
    pool.end().finally(() => process.exit(1));
  });
