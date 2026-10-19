import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFound } from './middlewares/errorHandler';
import './models';
import routes from './routes';

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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'sortex-api' });
});

app.use(routes);
app.use(notFound);
app.use(errorHandler);

export default app;
