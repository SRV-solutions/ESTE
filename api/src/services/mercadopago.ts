import crypto from 'crypto';
import { env } from '../config/env';
import { HttpError } from '../utils/http';

const API = 'https://api.mercadopago.com';

export const isMercadoPagoConfigured = () => !!env.mercadoPago.accessToken;

const mp = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  if (!isMercadoPagoConfigured()) throw new HttpError(503, 'Mercado Pago todavía no está configurado (falta MP_ACCESS_TOKEN).');
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.mercadoPago.accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[eventbox] Error de Mercado Pago', res.status, body);
    throw new HttpError(502, 'Mercado Pago rechazó la operación. Probá de nuevo en unos minutos.');
  }
  return body as T;
};

export interface CheckoutInput {
  paymentId: number;
  title: string;
  amountArs: number;
  payerEmail?: string | null;
}

/** Crea el checkout de Mercado Pago (Checkout Pro) para un pago de suscripción. */
export const createCheckout = async ({ paymentId, title, amountArs, payerEmail }: CheckoutInput) => {
  const back = `${env.appUrl}/billing`;
  const pref = await mp<{ id: string; init_point: string }>('/checkout/preferences', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': `eventbox-payment-${paymentId}` },
    body: JSON.stringify({
      items: [{ id: 'eventbox-mensual', title, quantity: 1, currency_id: 'ARS', unit_price: amountArs }],
      external_reference: String(paymentId),
      notification_url: `${env.apiPublicUrl}/billing/mercadopago/webhook`,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: 'approved',
      statement_descriptor: 'EVENTBOX SRV',
      ...(payerEmail ? { payer: { email: payerEmail } } : {}),
    }),
  });
  return { preferenceId: pref.id, checkoutUrl: pref.init_point };
};

export interface MpPayment {
  id: number;
  status: 'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
  date_approved: string | null;
}

export const getMpPayment = (id: string) => mp<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`);

/**
 * Valida la firma `x-signature` de los webhooks de Mercado Pago:
 * HMAC-SHA256 de `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` con la clave secreta.
 */
export const isValidWebhookSignature = (headers: Record<string, unknown>, dataId: string) => {
  const secret = env.mercadoPago.webhookSecret;
  if (!secret) return !env.isProduction; // Sin clave configurada solo se aceptan avisos en desarrollo.
  const signature = String(headers['x-signature'] || '');
  const requestId = String(headers['x-request-id'] || '');
  const parts = Object.fromEntries(signature.split(',').map((p) => p.trim().split('=') as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return expected.length === parts.v1.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
};
