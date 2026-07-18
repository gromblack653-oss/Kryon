import { Request, Response } from 'express';
import { productService } from './product.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { BadRequestError } from '../../utils/errors';
import { env } from '../../config/env';

export const productController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.list(req.query as never);
    res.json(result);
  }),

  facets: asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.facets(req.query as never);
    res.json(result);
  }),

  types: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await productService.listTypes());
  }),

  compare: asyncHandler(async (req: Request, res: Response) => {
    const result = await productService.compare(String(req.query.ids ?? ''));
    res.json(result);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getById(req.params.id);
    res.json(product);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.create(req.body);
    res.status(201).json(product);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.update(req.params.id, req.body);
    res.json(product);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await productService.remove(req.params.id);
    res.status(204).send();
  }),

  uploadImage: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestError('Файл зображення обовʼязковий (поле "image")');
    const imageUrl = `/${env.upload.dir}/${req.file.filename}`;
    await productService.addGalleryImage(req.params.id, imageUrl);
    const product = await productService.attachImage(req.params.id, imageUrl);
    res.json(product);
  }),

  addGalleryImage: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new BadRequestError('Файл зображення обовʼязковий (поле "image")');
    const imageUrl = `/${env.upload.dir}/${req.file.filename}`;
    const images = await productService.addGalleryImage(req.params.id, imageUrl);
    res.status(201).json(images);
  }),

  removeGalleryImage: asyncHandler(async (req: Request, res: Response) => {
    const images = await productService.removeGalleryImage(req.params.id, req.params.imageId);
    res.json(images);
  }),
};
