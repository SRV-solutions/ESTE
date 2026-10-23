import { env } from '../config/env';

/**
 * Mails con Resend (https://resend.com). Sin RESEND_API_KEY no se envía nada:
 * el mail se muestra en la consola (útil en desarrollo).
 */

export const isEmailConfigured = () => !!env.email.resendApiKey;

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plantilla con la estética de SRV: encabezado negro, azul #0B78FB y el punto naranja. */
const layout = (title: string, body: string) => `<!doctype html>
<html lang="es"><body style="margin:0;background:#f5f6f8;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#0d0d0d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e6eb">
<tr><td style="background:#000000;padding:20px 28px">
<span style="color:#ffffff;font-weight:900;font-size:20px;letter-spacing:-0.02em">Event Box</span><span style="color:#F6950A;font-weight:900;font-size:20px">.</span>
</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;font-weight:900;letter-spacing:-0.02em">${escape(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e3e6eb;color:#7a808a;font-size:12px">
Event Box es un producto de <a href="https://wearesrv.com" style="color:#0B78FB;text-decoration:none;font-weight:700">SRV</a>.
</td></tr>
</table></td></tr></table></body></html>`;

export const paragraph = (text: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#4a4f57">${escape(text)}</p>`;

export const button = (label: string, href: string) =>
  `<p style="margin:22px 0"><a href="${escape(href)}" style="display:inline-block;background:#0B78FB;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${escape(label)}</a></p>`;

export const details = (rows: Array<[string, string | null | undefined]>) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 16px;font-size:14px">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#7a808a;width:140px;vertical-align:top">${escape(k)}</td><td style="padding:6px 0;font-weight:600;white-space:pre-wrap">${escape(String(v))}</td></tr>`,
    )
    .join('')}</table>`;

interface SendInput {
  to: string | string[];
  subject: string;
  title: string;
  body: string;
  replyTo?: string;
}

/**
 * Envía un mail y dice por qué no salió (para la prueba del Panel SRV).
 * Nunca tira error: un mail que no sale no tiene que cortar la acción del usuario.
 */
export const sendEmailResult = async ({ to, subject, title, body, replyTo }: SendInput): Promise<{ ok: boolean; error?: string }> => {
  const html = layout(title, body);
  if (!isEmailConfigured()) {
    console.log(`[eventbox] (mail no enviado, falta RESEND_API_KEY) Para: ${to} · ${subject}`);
    return { ok: false, error: 'Falta RESEND_API_KEY en el servidor.' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.email.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.email.from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[eventbox] Resend rechazó el mail para ${to}`, res.status, text);
      let reason = text;
      try {
        reason = JSON.parse(text).message || text;
      } catch {
        /* no era JSON */
      }
      return { ok: false, error: `Resend respondió ${res.status}: ${reason}`.slice(0, 500) };
    }
    return { ok: true };
  } catch (err) {
    console.error('[eventbox] No se pudo enviar el mail', err);
    return { ok: false, error: `No se pudo conectar con Resend: ${(err as Error).message}` };
  }
};

export const sendEmail = async (input: SendInput) => (await sendEmailResult(input)).ok;
