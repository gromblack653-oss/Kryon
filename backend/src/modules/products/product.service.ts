import { productRepository, Product, PagedProducts } from './product.repository';
import { cached, invalidate } from '../../db/redis';
import { NotFoundError, ConflictError } from '../../utils/errors';
import { ListProductsQuery, CreateProductInput, UpdateProductInput } from './product.schemas';

const LIST_TTL = 60; // секунд
const listKey = (q: ListProductsQuery) => `products:list:${JSON.stringify(q)}`;

export const productService = {
  async list(q: ListProductsQuery): Promise<PagedProducts> {
    return cached(listKey(q), LIST_TTL, () => productRepository.list(q));
  },

  async facets(q: Parameters<typeof productRepository.facets>[0]) {
    return cached(`products:list:facets:${JSON.stringify(q)}`, LIST_TTL, () => productRepository.facets(q));
  },

  /** Типи компонентів для навігації каталогу. */
  async listTypes() {
    return cached('products:list:types', LIST_TTL, () => productRepository.listTypes());
  },

  async compare(idsCsv: string): Promise<Product[]> {
    // Дедуплікація: один товар не має двічі потрапляти в порівняння.
    const ids = [
      ...new Set(
        idsCsv
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    return productRepository.compareByIds(ids);
  },

  async getById(id: string): Promise<Product> {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  },

  /** Додає фото в галерею товару. */
  async addGalleryImage(id: string, url: string) {
    await this.getById(id); // 404, якщо товару немає
    const images = await productRepository.addImage(id, url);
    await invalidate('products:list:*');
    return images;
  },

  /** Прибирає фото з галереї. */
  async removeGalleryImage(id: string, imageId: string) {
    await this.getById(id);
    const images = await productRepository.removeImage(id, imageId);
    await invalidate('products:list:*');
    return images;
  },

  async create(input: CreateProductInput): Promise<Product> {
    try {
      const product = await productRepository.create(input);
      await invalidate('products:list:*');
      return product;
    } catch (err) {
      if (isUniqueViolation(err)) throw new ConflictError('Product slug already exists');
      throw err;
    }
  },

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const product = await productRepository.update(id, input);
    if (!product) throw new NotFoundError('Product not found');
    await invalidate('products:list:*');
    return product;
  },

  async remove(id: string): Promise<void> {
    const ok = await productRepository.remove(id);
    if (!ok) throw new NotFoundError('Product not found');
    await invalidate('products:list:*');
  },

  async attachImage(id: string, imageUrl: string): Promise<Product> {
    const product = await productRepository.setImage(id, imageUrl);
    if (!product) throw new NotFoundError('Product not found');
    await invalidate('products:list:*');
    return product;
  },
};

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505'
  );
}
