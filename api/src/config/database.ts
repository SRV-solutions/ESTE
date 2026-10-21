import { Sequelize } from 'sequelize';
import { env } from './env';

const options = {
  dialect: 'postgres' as const,
  logging: false,
  dialectOptions: env.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
};

/** Con DATABASE_URL (Railway, Render, Neon) se usa esa conexión; si no, DB_HOST/DB_USER/… */
export const sequelize = env.db.url
  ? new Sequelize(env.db.url, options)
  : new Sequelize({ ...options, host: env.db.host, port: env.db.port, username: env.db.username, password: env.db.password, database: env.db.database });
