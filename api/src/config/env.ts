import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const DEV_JWT_SECRET = 'eventbox-dev-secret';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción.');
}

const list = (value: string | undefined, fallback: string[]) =>
  value ? value.split(',').map((v) => v.trim()).filter(Boolean) : fallback;

const num = (value: string | undefined, fallback: number) => (value && !Number.isNaN(Number(value)) ? Number(value) : fallback);

export const env = {
  isProduction,
  port: num(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '20h',
  corsOrigins: list(process.env.CORS_ORIGINS, ['http://localhost:5173', 'https://este.wearesrv.com']),
  /** Rol que administra su empresa (usuarios, stock, suscripción). */
  adminRoleId: num(process.env.ADMIN_ROLE_ID, 1),
  /** URL pública de la API (para que Mercado Pago avise los pagos) y del front (para volver del checkout). */
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${num(process.env.PORT, 3000)}`,
  appUrl: process.env.APP_URL || 'http://localhost:5173',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: num(process.env.DB_PORT, 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'este',
    ssl: process.env.DB_SSL === 'true',
  },

  /** Radio (metros) alrededor del lugar dentro del cual el check-in cuenta como "en el lugar". */
  checkinRadiusM: num(process.env.CHECKIN_RADIUS_M, 300),

  billing: {
    trialDays: num(process.env.TRIAL_DAYS, 14),
    /** Días después del vencimiento en los que la empresa sigue entrando (con aviso) antes del bloqueo. */
    graceDays: num(process.env.BILLING_GRACE_DAYS, 10),
    dollarApiUrl: process.env.DOLLAR_API_URL || 'https://dolarapi.com/v1/dolares/blue',
  },

  /**
   * Cloudflare R2 (compatible con S3). Sin configurar, todo se guarda en disco (solo para desarrollo).
   * - Bucket público: logos, fotos de perfil y capturas de reportes (se sirven desde publicUrl).
   * - Bucket privado: recibos de sueldo y planos. Sin acceso público: los entrega la API a quien tiene permiso.
   */
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    publicBucket: process.env.R2_PUBLIC_BUCKET || '',
    privateBucket: process.env.R2_PRIVATE_BUCKET || '',
    /** Dominio público del bucket público (propio o r2.dev), sin barra final. */
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, ''),
  },

  /** Resend para enviar mails. Sin API key, los mails se muestran en la consola. */
  email: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'Event Box <no-reply@wearesrv.com>',
    /** Adónde llegan los reportes de problemas. */
    supportTo: process.env.SUPPORT_EMAIL || 'info@wearesrv.com',
  },

  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    /** Clave secreta de la sección Webhooks: valida que el aviso de pago venga de Mercado Pago. */
    webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
  },

  arca: {
    cuit: (process.env.ARCA_CUIT || '').replace(/\D/g, ''),
    /** Certificado y clave privada en PEM (contenido o ruta a archivo). */
    cert: process.env.ARCA_CERT || '',
    key: process.env.ARCA_KEY || '',
    pointOfSale: num(process.env.ARCA_POINT_OF_SALE, 0),
    /** 11 = Factura C (monotributo). */
    voucherType: num(process.env.ARCA_VOUCHER_TYPE, 11),
    production: process.env.ARCA_PRODUCTION === 'true',
    issuer: {
      name: process.env.ARCA_ISSUER_NAME || '',
      address: process.env.ARCA_ISSUER_ADDRESS || '',
      taxCondition: process.env.ARCA_ISSUER_TAX_CONDITION || 'Responsable Monotributo',
      grossIncome: process.env.ARCA_ISSUER_IIBB || '',
      activityStart: process.env.ARCA_ISSUER_ACTIVITY_START || '',
    },
  },
};

if (!process.env.JWT_SECRET) {
  console.warn('[eventbox] JWT_SECRET no está definido: usando un secreto de desarrollo.');
}
