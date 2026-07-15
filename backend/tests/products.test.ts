import request from 'supertest';

jest.mock('../src/db/redis', () => ({
  redis: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
  connectRedis: jest.fn(),
  cached: (_k: string, _t: number, loader: () => unknown) => loader(),
  invalidate: jest.fn(),
}));

jest.mock('../src/modules/products/product.repository', () => ({
  productRepository: {
    list: jest.fn(),
    findById: jest.fn(),
  },
}));

import { createApp } from '../src/app';
import { productRepository } from '../src/modules/products/product.repository';

const app = createApp();
const mockRepo = productRepository as jest.Mocked<typeof productRepository>;

describe('Products API', () => {
  it('GET /api/products повертає сторінку товарів', async () => {
    mockRepo.list.mockResolvedValue({
      items: [
        {
          id: 'p1',
          title: 'Test Product',
          slug: 'test-product',
          description: '',
          price_cents: 1000,
          stock: 5,
          image_url: null,
          category_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      pages: 1,
    });

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Test Product');
  });

  it('відхиляє некоректний параметр sort (400)', async () => {
    const res = await request(app).get('/api/products?sort=bogus');
    expect(res.status).toBe(400);
  });

  it('вимагає авторизацію для створення товару (401)', async () => {
    const res = await request(app).post('/api/products').send({
      title: 'X',
      slug: 'x',
      price: 100,
    });
    expect(res.status).toBe(401);
  });
});
