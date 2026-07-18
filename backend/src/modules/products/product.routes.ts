import { Router } from 'express';
import { productController } from './product.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { uploadImage } from '../../middleware/upload';
import {
  createProductSchema,
  listProductsSchema,
  updateProductSchema,
  facetsSchema,
  compareSchema,
} from './product.schemas';

const router = Router();

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Каталог товарів (пагінація, пошук, фільтри)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 12 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: minPrice, schema: { type: integer } }
 *       - { in: query, name: maxPrice, schema: { type: integer } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, price_asc, price_desc, title] } }
 *     responses:
 *       200: { description: Сторінка товарів }
 */
router.get('/', validate(listProductsSchema, 'query'), productController.list);

/**
 * @openapi
 * /api/products/types:
 *   get:
 *     tags: [Products]
 *     summary: Типи компонентів (відеокарти, процесори, БЖ, корпуси, RAM) з кількістю товарів
 */
router.get('/types', productController.types);

/**
 * @openapi
 * /api/products/facets:
 *   get:
 *     tags: [Products]
 *     summary: Доступні значення характеристик із лічильниками (для фільтрів)
 */
router.get('/facets', validate(facetsSchema, 'query'), productController.facets);

/**
 * @openapi
 * /api/products/compare:
 *   get:
 *     tags: [Products]
 *     summary: Товари для порівняння за списком id
 *     parameters:
 *       - { in: query, name: ids, required: true, schema: { type: string } }
 */
router.get('/compare', validate(compareSchema, 'query'), productController.compare);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Товар за id
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 */
router.get('/:id', productController.getById);

/**
 * @openapi
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Створити товар (admin)
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', authenticate, authorize('admin'), validate(createProductSchema), productController.create);

/**
 * @openapi
 * /api/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Оновити товар (admin)
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateProductSchema),
  productController.update,
);

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Видалити товар (admin)
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id', authenticate, authorize('admin'), productController.remove);

/**
 * @openapi
 * /api/products/{id}/image:
 *   post:
 *     tags: [Products]
 *     summary: Завантажити зображення товару (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 */
router.post(
  '/:id/image',
  authenticate,
  authorize('admin'),
  uploadImage.single('image'),
  productController.uploadImage,
);

/**
 * @openapi
 * /api/products/{id}/images:
 *   post:
 *     tags: [Products]
 *     summary: Додати фото в галерею товару (admin)
 *     security: [{ bearerAuth: [] }]
 */
router.post(
  '/:id/images',
  authenticate,
  authorize('admin'),
  uploadImage.single('image'),
  productController.addGalleryImage,
);

/**
 * @openapi
 * /api/products/{id}/images/{imageId}:
 *   delete:
 *     tags: [Products]
 *     summary: Видалити фото з галереї (admin)
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/:id/images/:imageId', authenticate, authorize('admin'), productController.removeGalleryImage);

export default router;
