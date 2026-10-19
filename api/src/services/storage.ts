import { DeleteObjectCommand, GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { env } from '../config/env';
import { HttpError } from '../utils/http';

/**
 * Archivos.
 * - Imágenes públicas (logos, fotos de perfil, capturas): bucket público de R2, servidas desde su dominio.
 * - Documentos privados (recibos, planos): bucket privado de R2, los entrega la API con permiso.
 * - Sin R2 (desarrollo): `api/uploads` y `api/private-uploads`.
 */

export const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

export const isR2Configured = () =>
  !!(env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.publicBucket && env.r2.privateBucket && env.r2.publicUrl);

let client: S3Client | null = null;
const r2 = () =>
  (client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
  }));

const IMAGE_TYPES = [
  { mime: 'image/png', ext: 'png', test: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/jpeg', ext: 'jpg', test: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/webp', ext: 'webp', test: (b: Buffer) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
  { mime: 'image/gif', ext: 'gif', test: (b: Buffer) => b.toString('ascii', 0, 4) === 'GIF8' },
];

/**
 * Valida que el archivo sea de verdad una imagen mirando sus primeros bytes (no la extensión).
 * SVG no se acepta: puede llevar scripts.
 */
export const detectImage = (buffer: Buffer) => {
  const type = IMAGE_TYPES.find((t) => t.test(buffer));
  if (!type) throw new HttpError(400, 'El archivo tiene que ser una imagen PNG, JPG, WEBP o GIF.');
  return type;
};

const publicUrl = (key: string) => (isR2Configured() ? `${env.r2.publicUrl}/${key}` : `${env.apiPublicUrl}/uploads/${key}`);

/** Guarda una imagen en `folder/prefijo-<aleatorio>.<ext>` y devuelve su URL pública. */
export const saveImage = async (buffer: Buffer, folder: string, prefix: string) => {
  const { mime, ext } = detectImage(buffer);
  const key = `${folder}/${prefix}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

  if (isR2Configured()) {
    await r2().send(
      new PutObjectCommand({
        Bucket: env.r2.publicBucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
        CacheControl: 'public, max-age=31536000, immutable', // El nombre es único: nunca cambia.
      }),
    );
  } else {
    const target = path.join(LOCAL_UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
  }
  return publicUrl(key);
};

// ---------- Documentos privados (recibos de sueldo, planos) ----------
// Nunca tienen URL pública: se guardan con una clave y la API los entrega solo a quien tiene permiso.

export const LOCAL_PRIVATE_DIR = path.join(__dirname, '..', '..', 'private-uploads');

const DOCUMENT_TYPES = [
  { mime: 'application/pdf', ext: 'pdf', test: (b: Buffer) => b.toString('ascii', 0, 5) === '%PDF-' },
  { mime: 'image/vnd.dwg', ext: 'dwg', test: (b: Buffer) => /^AC10\d\d$/.test(b.toString('ascii', 0, 6)) },
  ...IMAGE_TYPES.filter((t) => t.ext !== 'gif'),
];

export type DocumentKind = 'pdf' | 'plano';

/** Valida el contenido real: un recibo solo puede ser PDF; un plano, PDF, imagen o DWG (AutoCAD). */
export const detectDocument = (buffer: Buffer, kind: DocumentKind) => {
  const allowed = kind === 'pdf' ? DOCUMENT_TYPES.filter((t) => t.ext === 'pdf') : DOCUMENT_TYPES;
  const type = allowed.find((t) => t.test(buffer));
  if (!type) {
    throw new HttpError(400, kind === 'pdf' ? 'El archivo tiene que ser un PDF.' : 'El plano tiene que ser PDF, imagen (PNG/JPG/WEBP) o DWG.');
  }
  return type;
};

export const savePrivateFile = async (buffer: Buffer, folder: string, kind: DocumentKind) => {
  const { mime, ext } = detectDocument(buffer, kind);
  const key = `privado/${folder}/${crypto.randomBytes(12).toString('hex')}.${ext}`;
  if (isR2Configured()) {
    await r2().send(new PutObjectCommand({ Bucket: env.r2.privateBucket, Key: key, Body: buffer, ContentType: mime }));
  } else {
    const target = path.join(LOCAL_PRIVATE_DIR, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
  }
  return { key, mime };
};

/** Abre un documento privado como stream (sin cargarlo entero en memoria). */
const openPrivateFile = async (key: string): Promise<{ stream: Readable; size?: number }> => {
  if (key.includes('..') || !key.startsWith('privado/')) throw new HttpError(400, 'Archivo inválido.');
  try {
    if (isR2Configured()) {
      const obj = await r2().send(new GetObjectCommand({ Bucket: env.r2.privateBucket, Key: key }));
      return { stream: obj.Body as Readable, size: obj.ContentLength };
    }
    const file = path.join(LOCAL_PRIVATE_DIR, key);
    const { size } = await fs.stat(file);
    return { stream: createReadStream(file), size };
  } catch (err) {
    const missing = err instanceof NoSuchKey || (err as NodeJS.ErrnoException).code === 'ENOENT';
    if (!missing) console.error('[eventbox] No se pudo leer el archivo', key, err);
    throw new HttpError(404, 'El archivo ya no está disponible.');
  }
};

/**
 * Manda un documento privado en la respuesta (el permiso ya lo validó el controller).
 * `inline` lo muestra en el navegador; si no, se descarga. Nunca se cachea.
 */
export const sendPrivateFile = async (
  res: Response,
  key: string,
  { contentType, fileName, inline }: { contentType: string; fileName: string; inline: boolean },
) => {
  const { stream, size } = await openPrivateFile(key);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${safeFileName(fileName)}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  if (size) res.setHeader('Content-Length', String(size));
  await pipeline(stream, res);
};

export const deletePrivateFile = async (key: string | null | undefined) => {
  if (!key || key.includes('..') || !key.startsWith('privado/')) return;
  try {
    if (isR2Configured()) await r2().send(new DeleteObjectCommand({ Bucket: env.r2.privateBucket, Key: key }));
    else await fs.unlink(path.join(LOCAL_PRIVATE_DIR, key));
  } catch (err) {
    console.warn('[eventbox] No se pudo borrar el archivo privado', key, err);
  }
};

/** Nombre de archivo seguro para el encabezado Content-Disposition. */
export const safeFileName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w.\- ]+/g, '_')
    .slice(0, 150) || 'archivo';

/** Borra un archivo que subimos nosotros (si la URL es de otro lado, no hace nada). */
export const deleteByUrl = async (url: string | null | undefined) => {
  if (!url) return;
  const base = isR2Configured() ? `${env.r2.publicUrl}/` : `${env.apiPublicUrl}/uploads/`;
  if (!url.startsWith(base)) return;
  const key = url.slice(base.length);
  if (key.includes('..')) return;
  try {
    if (isR2Configured()) await r2().send(new DeleteObjectCommand({ Bucket: env.r2.publicBucket, Key: key }));
    else await fs.unlink(path.join(LOCAL_UPLOAD_DIR, key));
  } catch (err) {
    // Si el archivo viejo no se puede borrar, no se corta la operación del usuario.
    console.warn('[eventbox] No se pudo borrar el archivo', key, err);
  }
};
