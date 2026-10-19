import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';
import { HttpError } from '../utils/http';

/**
 * Archivos (logos, fotos de perfil, capturas de reportes).
 * - Con R2 configurado se suben a Cloudflare R2 y se sirven desde su dominio público.
 * - Sin R2 (desarrollo) se guardan en `api/uploads` y los sirve la propia API.
 */

export const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

export const isR2Configured = () =>
  !!(env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucket && env.r2.publicUrl);

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
        Bucket: env.r2.bucket,
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

/** Borra un archivo que subimos nosotros (si la URL es de otro lado, no hace nada). */
export const deleteByUrl = async (url: string | null | undefined) => {
  if (!url) return;
  const base = isR2Configured() ? `${env.r2.publicUrl}/` : `${env.apiPublicUrl}/uploads/`;
  if (!url.startsWith(base)) return;
  const key = url.slice(base.length);
  if (key.includes('..')) return;
  try {
    if (isR2Configured()) await r2().send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: key }));
    else await fs.unlink(path.join(LOCAL_UPLOAD_DIR, key));
  } catch (err) {
    // Si el archivo viejo no se puede borrar, no se corta la operación del usuario.
    console.warn('[eventbox] No se pudo borrar el archivo', key, err);
  }
};
