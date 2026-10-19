# Sortex

Stock y órdenes de servicio para empresas de eventos. Un producto de [SRV](https://wearesrv.com), hermano de Sentryx.

- **Multiempresa**: cada empresa tiene su stock, sus contenedores, lugares, órdenes y usuarios, separados del resto.
- **Suscripción**: USD 400 por mes, cobrados en pesos al dólar blue con Mercado Pago y facturados en ARCA (ver [docs/COBROS.md](docs/COBROS.md)).
- `api/`: Express + Sequelize + PostgreSQL (TypeScript).
- `front/`: React + Vite + MUI, con el sistema visual de SRV.

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
```

## Usuarios

- **Equipo de SRV (superadmin)**: entra al **Panel SRV**, crea empresas con su primer administrador, ve pagos y facturas, registra pagos manuales y suspende empresas. Se habilita con:

  ```bash
  cd api
  yarn superadmin:dev <usuario>          # en desarrollo
  yarn build && yarn superadmin <usuario> # en producción
  ```

- **Administrador de una empresa** (rol *Administrador*): gestiona usuarios, stock y órdenes, y en **Mi empresa** edita los datos de la empresa y paga la suscripción.
- **Resto de los roles**: lo que permita su rol dentro de su empresa.

## Base de datos

Las migraciones están en `api/src/db/migrations` y se aplican solas al iniciar la API. Cada una corre en una transacción y queda registrada en la tabla `SortexMigration`. Para aplicarlas sin levantar la API: `yarn build && yarn db:migrate`.

Una base vacía arranca con los roles y permisos de fábrica. Una base existente de E.S.T.E. pasa a ser la empresa 1.

## Reglas de las órdenes

El flujo es: creada → en revisión → aprobada (o rechazada → en revisión) → armando → lista → despachada → en el evento → volviendo → recibida → revisando material → desarmada.

- Quien la crea carga el material mientras está creada o rechazada, la envía a revisión y avanza el tramo logístico (de "lista" en adelante).
- Quien la chequea la aprueba o la rechaza.
- Quien la arma la pasa a "armando" y a "lista".
- El administrador de la empresa puede hacer cualquier paso válido.
- Al desarmar, todos los ítems vuelven a quedar libres.

Las reglas se validan en la API (`api/src/services/serviceOrderPolicy.ts`).

## Contenedores

Un contenedor (baúl, rack, caja) puede tener **contenido fijo**, que viaja siempre con él (Stock → Contenido fijo), o recibir ítems **solo para una orden**. Los contenedores pueden ir uno dentro de otro, y todo lo que está adentro queda ocupado mientras el de afuera está en una orden. Los dos tipos de contenido se pueden vaciar de una vez.
