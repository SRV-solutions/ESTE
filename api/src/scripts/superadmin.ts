/**
 * Da (o quita) acceso al panel de SRV a un usuario existente.
 *   yarn superadmin <usuario>          → lo hace superadmin
 *   yarn superadmin <usuario> --quitar → le saca el permiso
 */
import { sequelize } from '../config/database';
import { migrate } from '../db/migrate';
import { User } from '../models';

const main = async () => {
  const [username, flag] = process.argv.slice(2);
  if (!username) throw new Error('Uso: yarn superadmin <usuario> [--quitar]');
  await migrate();
  const user = await User.findOne({ where: { username } });
  if (!user) throw new Error(`No existe el usuario "${username}".`);
  const value = flag !== '--quitar';
  await user.update({ isSuperAdmin: value });
  console.log(`${username} ${value ? 'ahora es superadmin de SRV' : 'ya no es superadmin'}.`);
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
