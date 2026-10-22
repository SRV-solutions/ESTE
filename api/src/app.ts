import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/errorHandler';
import './models';
import routes from './routes';
import { auditRequests } from './services/audit';
import { isR2Configured, LOCAL_UPLOAD_DIR } from './services/storage';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // Detrás de Caddy/Nginx: el rate limit usa la IP real.
app.use(helmet());
app.use(compression());
// En desarrollo se acepta cualquier puerto de localhost (Vite cambia de puerto si el 5173 está ocupado).
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const isAllowedOrigin = (origin?: string) =>
  !origin || env.corsOrigins.includes(origin) || (!env.isProduction && LOCALHOST.test(origin));

app.use(
  cors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  }),
);
app.use(express.json({ limit: '1mb' }));

// Imágenes guardadas en disco cuando R2 no está configurado (desarrollo).
// `cross-origin` para que el front, en otro dominio o puerto, las pueda mostrar y meter en los PDF.
if (!isR2Configured()) {
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      next();
    },
    express.static(LOCAL_UPLOAD_DIR, { maxAge: '365d', immutable: true, index: false, dotfiles: 'deny' }),
  );
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'eventbox-api' });
});

app.use(auditRequests);
app.use(routes);
app.use(notFound);
app.use(errorHandler);

export default app;
