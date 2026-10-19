import { env } from '../config/env';
import { HttpError } from '../utils/http';

export interface DollarRate {
  /** Precio de venta del dólar blue en pesos (el que se usa para convertir la suscripción). */
  sell: number;
  buy: number;
  updatedAt: string;
  source: string;
}

const CACHE_MS = 15 * 60 * 1000;
let cache: { rate: DollarRate; at: number } | null = null;

/** Cotización del dólar blue (dolarapi.com), con caché de 15 minutos. */
export const getBlueRate = async (): Promise<DollarRate> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rate;
  try {
    const res = await fetch(env.billing.dollarApiUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { compra: number; venta: number; fechaActualizacion: string };
    if (!(data.venta > 0)) throw new Error('cotización inválida');
    const rate = { sell: data.venta, buy: data.compra, updatedAt: data.fechaActualizacion, source: 'dolarapi.com (blue)' };
    cache = { rate, at: Date.now() };
    return rate;
  } catch (err) {
    // Si la API no responde, una cotización de hasta 12 h sirve más que cortar el cobro.
    if (cache && Date.now() - cache.at < 12 * 60 * 60 * 1000) return cache.rate;
    console.error('[sortex] No se pudo obtener el dólar blue:', err);
    throw new HttpError(503, 'No se pudo obtener la cotización del dólar. Probá de nuevo en unos minutos.');
  }
};

/** Pesos redondeados a la centena (un monto prolijo para cobrar). */
export const usdToArs = (usd: number, rate: number) => Math.ceil((usd * rate) / 100) * 100;
