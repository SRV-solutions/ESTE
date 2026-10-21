# Event Box

Stock y órdenes de servicio para empresas de eventos. Un producto de [SRV](https://wearesrv.com), hermano de Sentryx.

- **Multiempresa**: cada empresa tiene su stock, sus contenedores, lugares, órdenes y usuarios, separados del resto.
- **Abono mensual** según el plan, en dólares, que se paga a principio de mes en pesos al dólar blue. Por ahora el pago se coordina con SRV y se registra desde el Panel SRV. El cobro online (Mercado Pago) y la factura de ARCA están programados pero apagados (ver [docs/COBROS.md](docs/COBROS.md)).
- **Imágenes en Cloudflare R2 y mails con Resend**: logo de cada empresa, foto de perfil, capturas de reportes, recuperación de contraseña y avisos (ver [docs/ARCHIVOS_Y_MAILS.md](docs/ARCHIVOS_Y_MAILS.md)).
- **Reportar un problema**: botón en la barra superior; llega al Panel SRV (Reportes) y por mail a soporte.
- `api/`: Express + Sequelize + PostgreSQL (TypeScript).
- `front/`: React + Vite + MUI, con el sistema visual de SRV.
- `mobile/`: app para iOS y Android con Expo / React Native (ver [docs/MOBILE.md](docs/MOBILE.md)).

## Documentación

- [Guía de uso con capturas](docs/GUIA_DE_USO.md): cada pantalla, paso a paso.
- [Guía en PDF](docs/Event-Box-Guia-de-uso-planes-y-alcances.pdf): uso, planes, requisitos y alcances, para mandarle a un cliente.
- [App móvil](docs/MOBILE.md): probarla con Expo Go y publicarla en las tiendas.
- [Archivos (R2) y mails (Resend)](docs/ARCHIVOS_Y_MAILS.md) · [Cobros](docs/COBROS.md).

## Planes

| | Básico | Profesional | Empresa |
|---|---|---|---|
| Abono mensual | USD 550 | USD 750 | USD 900 |
| Usuarios de la app | 30 | 100 | 250 |
| Accesos temporales a la vez (hasta 10 días, renovables) | 10 | 40 | 100 |
| Por usuario | USD 18,33 | USD 7,50 | USD 3,60 |
| Stock, contenedores, eventos, órdenes, PDF, CSV | ✓ | ✓ | ✓ |
| Duplicar eventos y pasar material entre eventos | | ✓ | ✓ |
| Responsables por etapa (logística, recepción) | | ✓ | ✓ |
| Planos compartidos | | ✓ | ✓ |
| Personal y recibos de sueldo con firma | | ✓ | ✓ |
| Check-in / check-out en el evento con geolocalización | | | ✓ |
| Reportes y estadísticas de uso del stock | | | ✓ |
| Varios depósitos, API *(en desarrollo)* | | | ✓ |
| Soporte prioritario | | | ✓ |

La lógica: de Básico a Profesional se pagan las funciones, y el costo por usuario baja de USD 18,33
a USD 7,50; de Profesional a Empresa la diferencia es de USD 150, pero suma 150 usuarios y la operación
en el evento, así que el costo por usuario baja a menos de la mitad. Los planes viven en `api/src/config/plans.ts`. La API bloquea los módulos que
el plan no incluye y el límite de usuarios. En el menú aparecen con candado, o con "Pronto" si están
en desarrollo.

## Abono

El abono es por mes calendario y se paga a principio de mes. Pagado el mes, la empresa usa Event Box
hasta el último día. Si no paga, tiene hasta el día 10 (`BILLING_GRACE_DAYS`) con un aviso; después
la app se bloquea y solo el administrador entra a ver el abono pendiente. En **Mi empresa** se ve
únicamente lo que se debe del mes. SRV registra cada pago en **Panel SRV → empresa → Registrar pago**.

## Desarrollo

```bash
# API (puerto 3000). Al arrancar aplica las migraciones pendientes.
cd api
cp .env.example .env   # completá DB_PASSWORD y JWT_SECRET
yarn install
yarn dev

# Front (puerto 5173)
cd front
cp .env.example .env
yarn install
yarn dev

# App móvil (Expo Go en el celular, misma red Wi-Fi)
cd mobile
npm install
npx expo start
```

## Usuarios

Se entra con el **usuario, el email o el DNI** (sin puntos o con puntos, da igual) y la contraseña. El DNI se carga en
Mi perfil o en Equipo; si la persona tiene CUIL en su ficha, se completa solo. **Llevar al celular** (abajo del menú) muestra
un QR que entra directo en el teléfono con la sesión de la PC: es de un solo uso y vence a los 5 minutos.

- **Equipo de SRV (superadmin)**: entra al **Panel SRV**, crea empresas con su primer administrador, ve pagos y facturas, registra pagos manuales y suspende empresas. Se habilita con:

  ```bash
  cd api
  yarn superadmin:dev <usuario>          # en desarrollo
  yarn build && yarn superadmin <usuario> # en producción
  ```

- **Administrador de una empresa** (rol *Administrador*): gestiona el equipo, el stock y las órdenes, y en **Mi empresa** edita los datos de la empresa y ve el abono.
- **Resto de los roles**: lo que permita su rol dentro de su empresa.

### Equipo

Todas las personas de la empresa están en **Equipo**, cada una con un tipo de acceso:

| Acceso | Entra a la app | Cuenta para el plan | Uso |
|---|---|---|---|
| Usa la app | Sí, con su rol | Sí | El equipo fijo |
| Temporal | De 1 a 10 días; después se corta solo. Se renueva las veces que haga falta | No (hay un tope de temporales activos por plan) | Un evento, un reemplazo. No puede ser administrador |
| Sin acceso | No | No | Eventuales o personal que solo cobra (requiere el módulo de sueldos). Firma los recibos en papel |

Con el módulo de sueldos, cada persona suma sus datos laborales (CUIL, puesto, área, ingreso) y en **Sueldos** se cargan los recibos del mes.

**Roles y permisos** (pestaña de Equipo): cada empresa tiene sus propios roles y define qué puede ver, crear, editar y borrar cada uno en órdenes, eventos, lugares, stock, categorías, equipo, planos, sueldos, check-in y reportes. Los módulos que el plan no incluye se muestran con candado: el permiso se guarda y se activa al cambiar de plan. Los modifica solo el Administrador. El rol Administrador es fijo (todos los permisos). Una empresa nueva arranca con una copia de los roles de fábrica. Solo un administrador puede dar el rol Administrador o modificar a otro administrador, y nadie cambia su propio rol ni su propio acceso.

## Base de datos

### Llevar la base a producción

```bash
scripts/db-dump.sh                      # backup de la base local "este" → backups/eventbox-produccion-<fecha>.dump
scripts/db-restore.sh backups/eventbox-produccion-<fecha>.dump postgres://usuario:clave@host:5432
```

`db-restore.sh` crea la base **eventbox** en ese servidor (si existe, pide confirmación y la reemplaza) y
restaura el backup. Después, en el `.env` de la API, `DB_NAME=eventbox` con el host, usuario y clave del
servidor; al arrancar, la API aplica sola las migraciones que falten. Sin URL, usa el Postgres local
(`PGHOST`, `PGUSER`, `PGPASSWORD`). Los backups quedan fuera del repo (`backups/` está ignorado).

Las migraciones están en `api/src/db/migrations` y se aplican solas al iniciar la API. Cada una corre en una transacción y queda registrada en la tabla `EventBoxMigration`. Para aplicarlas sin levantar la API: `yarn build && yarn db:migrate`.

Una base vacía arranca con los roles y permisos de fábrica. Una base existente de E.S.T.E. pasa a ser la empresa 1. Las bases creadas cuando la app se llamaba Sortex conservan su historial: la tabla `SortexMigration` se renombra sola.

## Reglas de las órdenes

El flujo es: creada → en revisión → aprobada (o rechazada → en revisión) → armando → lista → despachada → en el evento → volviendo → recibida → revisando material → desarmada.

Cada etapa tiene un responsable, y es él quien avanza el estado:

| Etapa | Estados | Responsable |
|---|---|---|
| Preparación | creada, rechazada | Quien creó la orden |
| Chequeo | en revisión | Quien la chequea. Nadie aprueba su propia orden: sin chequeador, la revisa un administrador |
| Armado en depósito | aprobada, armando | Quien la arma |
| Logística y traslado | lista, despachada, en el evento | Responsable de logística |
| Recepción y desarme | volviendo, recibida, revisando material | Responsable de recepción |

- Si una etapa no tiene responsable asignado, la avanza quien creó la orden (salvo el chequeo).
- Los responsables se pueden reasignar durante todo el recorrido (administrador o quien creó la orden).
- El administrador de la empresa puede hacer cualquier paso válido.
- Al desarmar, todos los ítems vuelven a quedar libres.
- **Pasar material a otro evento**: desde "en el evento" en adelante, todo el material pasa directo a otra orden, sin volver al depósito. La orden original queda cerrada con el enlace a la nueva.
- **Duplicar un evento**: copia los datos y, si se pide, arma una orden nueva con la misma cantidad de ítems por categoría, tomados del stock libre.

Las reglas se validan en la API (`api/src/services/serviceOrderPolicy.ts`).

## Contenedores

Un contenedor (baúl, rack, caja) puede tener **contenido fijo**, que viaja siempre con él (Stock → Contenido fijo), o recibir ítems **solo para una orden**. Los contenedores pueden ir uno dentro de otro, y todo lo que está adentro queda ocupado mientras el de afuera está en una orden. Los dos tipos de contenido se pueden vaciar de una vez.

## Acuerdos especiales (Panel SRV)

Desde **Panel SRV → empresa → Acuerdo especial**, SRV puede pactar con una empresa, por un período (desde / hasta, o sin vencimiento), un **precio propio por mes** (incluso 0), los **módulos** que quiera sin importar el plan y límites propios de usuarios y temporales. Mientras rige, la empresa ve "Acuerdo especial" en Mi empresa, paga ese precio y no puede cambiar de plan desde la app; al vencer, vuelve sola a su plan y precio de lista. Se guarda en `Company.deal*` y lo resuelve `api/src/services/plan.ts` (`effectivePlan`).

## Check-in / out y reportes (plan Empresa)

- **Check-in / out**: desde la app móvil o la web, la persona registra cuándo el material llega al evento (check-in) y cuándo se retira (check-out). Si el lugar tiene coordenadas (se cargan en Lugares con "Estoy acá" o desde Google Maps), la API calcula la distancia: dentro del radio (`CHECKIN_RADIUS_M`, 300 m por defecto) queda "en el lugar"; si está lejos, avisa y pide confirmación.
- **Reportes**: órdenes por mes y por estado, categorías más pedidas, ítems más usados, lugares con más eventos, quién pide más, ítems nunca usados, ciclo promedio de una orden y check-ins del período.

## Equipo: desactivar y eliminar

Desde la ficha de una persona: **Desactivar** la deja sin acceso y sin contar para el plan, conservando todo (se revierte cuando quieras). **Eliminar definitivamente** (solo administradores) borra el usuario y sus recibos; las órdenes que creó quedan sin creador.

## Llevar Event Box al celular

El botón **Llevar al celular**, abajo del menú, muestra un QR con la dirección del sitio; en el teléfono, el mismo botón explica cómo agregarla a la pantalla de inicio (abre a pantalla completa con el ícono de Event Box). La app nativa está en `mobile/`.
