import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

const uploadDir = path.resolve(process.cwd(), env.upload.dir);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const uploadImage = multer({
  storage,
  limits: { fileSize: env.upload.maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      cb(new BadRequestError('Дозволені формати: jpeg, png, webp'));
      return;
    }
    cb(null, true);
  },
});

const ALLOWED_AUDIO = new Set([
  'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3',
  'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac',
]);

/** Завантаження аудіозаписів дзвінків (MicroSIP пише WAV/MP3). */
export const uploadAudio = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // до 25 МБ на запис
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_AUDIO.has(file.mimetype)) {
      cb(new BadRequestError('Дозволені аудіоформати: wav, mp3, ogg, webm, m4a'));
      return;
    }
    cb(null, true);
  },
});
