import { downloadPrivate } from './api';

/**
 * Archivos privados (planos, recibos) ya bajados en esta sesión: volver a abrirlos es instantáneo.
 * Se guardan los últimos 12 para no llenar la memoria del celular.
 */
const cache = new Map(); // path -> { url, type, size }
const MAX = 12;

export const cachedFile = (path) => cache.get(path) ?? null;

export const getPrivateFile = async (path, options) => {
  const hit = cache.get(path);
  if (hit) return hit;
  const blob = await downloadPrivate(path, options);
  const entry = { url: URL.createObjectURL(blob), type: blob.type, size: blob.size };
  cache.set(path, entry);
  if (cache.size > MAX) {
    const [oldest, old] = cache.entries().next().value;
    URL.revokeObjectURL(old.url);
    cache.delete(oldest);
  }
  return entry;
};

/** Guarda en el dispositivo un archivo ya bajado. */
export const saveFile = (url, fileName) => {
  Object.assign(document.createElement('a'), { href: url, download: fileName || 'archivo' }).click();
};

export const isPdf = (type) => /pdf/i.test(type || '');
export const isImage = (type) => /^image\//i.test(type || '') && !/dwg/i.test(type || '');
