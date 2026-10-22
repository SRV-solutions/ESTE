// Arranque de la API: conecta a la base, aplica migraciones pendientes y escucha.
import app from './app';
import { sequelize } from './config/database';
import { env } from './config/env';
import { migrate } from './db/migrate';
import { pruneAudit } from './services/audit';

const start = async () => {
  await sequelize.authenticate();
  await migrate();
  await pruneAudit().catch((err) => console.error('[eventbox] Limpieza de auditoría:', err.message));
  app.listen(env.port, () => {
    console.log(`[eventbox] API escuchando en el puerto ${env.port}`);
  });
};

start().catch((err) => {
  console.error('[eventbox] No se pudo iniciar la API:', err);
  process.exit(1);
});
