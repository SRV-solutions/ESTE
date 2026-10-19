import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import type { Request } from 'express';
import { HttpError } from '../utils/http';

/**
 * Subida de archivos con multer.
 * - En memoria: el archivo va directo a R2 (o a disco en desarrollo) sin pasar por archivos temporales.
 * - Límites de tamaño y de cantidad por tipo, para no cargar en memoria más de lo necesario.
 * - `fileFilter` descarta el archivo por tipo/extensión antes de leerlo entero; después,
 *   services/storage valida el contenido real mirando sus primeros bytes.
 * Todos reciben un solo archivo en el campo `file`.
 */

const MB = 1024 * 1024;

type Rule = { mimes: string[]; exts: string[]; message: string };

const filter =
  ({ mimes, exts, message }: Rule) =>
  (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (mimes.includes(file.mimetype) || exts.includes(ext)) cb(null, true);
    else cb(new HttpError(400, message));
  };

const single = (maxBytes: number, rule: Rule) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 20, fieldSize: 64 * 1024 },
    fileFilter: filter(rule),
  }).single('file');

const IMAGE: Rule = {
  mimes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  exts: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  message: 'El archivo tiene que ser una imagen PNG, JPG, WEBP o GIF.',
};

/** CSV de stock. Se valida por extensión porque Windows suele mandarlos como application/vnd.ms-excel. */
export const csvUpload = single(5 * MB, { mimes: [], exts: ['.csv'], message: 'Solo se permiten archivos .csv' });

/** Logo de la empresa, foto de perfil, captura de un reporte. */
export const imageUpload = single(5 * MB, IMAGE);

/** Recibos de sueldo: solo PDF. */
export const pdfUpload = single(25 * MB, { mimes: ['application/pdf'], exts: ['.pdf'], message: 'El recibo tiene que ser un PDF.' });

/** Planos: PDF, imagen o DWG (AutoCAD suele llegar como application/octet-stream). */
export const blueprintUpload = single(25 * MB, {
  mimes: ['application/pdf', ...IMAGE.mimes.filter((m) => m !== 'image/gif'), 'image/vnd.dwg', 'application/acad'],
  exts: ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.dwg'],
  message: 'El plano tiene que ser PDF, imagen (PNG/JPG/WEBP) o DWG.',
});
