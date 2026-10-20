import { HttpError } from './http';

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

/** Coordenadas opcionales: las dos o ninguna, y dentro de rango. */
export const parseCoords = (lat: unknown, lng: unknown): { lat: number | null; lng: number | null } => {
  const empty = (v: unknown) => v === undefined || v === null || v === '';
  if (empty(lat) && empty(lng)) return { lat: null, lng: null };
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) {
    throw new HttpError(400, 'Las coordenadas no son válidas (latitud entre -90 y 90, longitud entre -180 y 180).', { lat: 'Coordenadas inválidas.' });
  }
  return { lat: la, lng: ln };
};
