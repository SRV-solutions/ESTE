import { lazy } from 'react';

const KEY = 'eventbox:recargada-por-version';

/**
 * Como React.lazy, pero si se publicó una versión nueva mientras la app estaba abierta, el archivo
 * de la pantalla vieja ya no existe: en vez de quedar en blanco, recarga una vez para traer la nueva.
 */
export const lazyPage = (load) =>
  lazy(() =>
    load().then(
      (mod) => {
        try {
          sessionStorage.removeItem(KEY);
        } catch {
          /* sin almacenamiento: no pasa nada */
        }
        return mod;
      },
      (err) => {
        let already = false;
        try {
          already = sessionStorage.getItem(KEY) === '1';
          sessionStorage.setItem(KEY, '1');
        } catch {
          already = true; // sin almacenamiento no se puede evitar un bucle: no se recarga
        }
        if (already) throw err;
        window.location.reload();
        return new Promise(() => {}); // la página se está recargando
      },
    ),
  );
