# App móvil (Expo / React Native)

La app móvil de Event Box vive en `mobile/`. Está hecha con **Expo (SDK 57)** y **React Native**, así que la
misma base corre en **iOS y Android**. Usa la misma API que la versión web (no hay nada que agregar
en el servidor) y mantiene el sistema visual de SRV: negro, azul `#0B78FB`, naranja `#F6950A`,
títulos en 900.

## Qué hace

| Pantalla | Qué se puede hacer |
|---|---|
| **Ingreso** | Usuario y contraseña. Abajo se puede cambiar la dirección del servidor (red local o producción). |
| **Inicio** | Saludo, logo de la empresa, cuántas órdenes están en curso y cuántas te tocan a vos, y la lista de las que te tocan. Avisos de abono pendiente y de acceso temporal. |
| **Órdenes** | Lista con filtros (en curso, me toca, mías, participo, todas) y buscador. Tirá hacia abajo para actualizar. |
| **Orden** | Etapa actual y quién la avanza. Si te toca, los botones para avanzarla (aprobar, rechazar, despachar, recibir…) con confirmación. Datos, responsables y el material agrupado por categoría. |
| **Stock** | Búsqueda por código o categoría, carga por páginas al llegar al final, contenedores con la cantidad de ítems adentro. |
| **Más** | Perfil (foto desde la galería), Mis recibos, Eventos, Reportar un problema, servidor y cerrar sesión. |
| **Mis recibos** | Ver el PDF (se abre con el visor del teléfono), firmar en conformidad o en disconformidad con el motivo. |
| **Eventos** | Lista con buscador y cuántas órdenes tiene cada uno. |
| **Reportar un problema** | Tipo, mensaje y captura opcional; le llega a SRV. |

Las pantallas que ve cada persona dependen de su rol y del plan, igual que en la web. Lo que no
está en la app (cargar stock, crear órdenes, equipo, sueldos de todo el personal, Mi empresa) se
hace desde la versión web.

## Probarla con Expo Go

1. Instalá **Expo Go** en el celular (App Store / Google Play).
2. El celular y la PC tienen que estar en la **misma red Wi-Fi**.
3. En la PC, con la API corriendo (`cd api && yarn dev`):
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
4. Escaneá el QR que aparece en la terminal (Android: desde Expo Go; iPhone: con la cámara). También
   podés escribir la dirección a mano en Expo Go: `exp://IP-DE-LA-PC:8081`.
5. En la pantalla de ingreso, tocá **Servidor** y poné la IP de la PC con el puerto de la API, por
   ejemplo `http://192.168.0.10:3000`. Queda guardada en el teléfono.

![QR de Expo Go](img/expo-go-qr.png)

Si el celular no llega a la API, lo más común es el **firewall de Windows**: tiene que permitir
conexiones entrantes a Node en los puertos **3000** (API) y **8081** (Metro). La primera vez que se
levanta, Windows suele preguntar; si se le dijo que no, se habilita desde *Firewall de Windows
Defender → Permitir una aplicación*.

La dirección por defecto del servidor está en `mobile/app.json` (`extra.apiUrl`) y se puede
pisar con la variable `EXPO_PUBLIC_API_URL` al arrancar.

## Estructura

```
mobile/
  app/                 rutas (Expo Router): cada archivo es una pantalla
    _layout.jsx        sesión, redirección al login, navegación
    login.jsx
    (tabs)/            pestañas: index (Inicio), orders, items, more
    orders/[id].jsx    detalle de una orden
    payslips.jsx       mis recibos
    events.jsx
    feedback.jsx       reportar un problema
  src/
    lib/               api (fetch + token en almacenamiento seguro), theme, format, status, useLoader
    context/           AuthContext (sesión, permisos, plan)
    components/        ui (Card, Chip, Button, Field…), Screen
  assets/              íconos y splash (generados con el logo de Event Box)
```

Comandos útiles:

```bash
npx expo start          # servidor de desarrollo
npx expo start --tunnel # si el celular no está en la misma red (más lento)
npx eslint app src      # lint
npx expo-doctor         # revisa dependencias y configuración
```

## Publicarla en las tiendas

Con Expo no hace falta Xcode ni Android Studio: se compila en la nube con **EAS**.

```bash
npm install -g eas-cli
eas login
eas build --platform android   # genera el .aab para Google Play (o --profile preview para un .apk)
eas build --platform ios       # necesita una cuenta de Apple Developer
eas submit                     # sube a las tiendas
```

Antes de publicar, en `mobile/app.json`:
- `extra.apiUrl` → la URL pública de la API.
- `ios.bundleIdentifier` y `android.package` ya están como `com.wearesrv.eventbox`.
- Para una API sin HTTPS, iOS y Android bloquean el tráfico; en producción la API tiene que ir
  por HTTPS (Caddy o Nginx con certificado).

Las actualizaciones de JavaScript se pueden mandar sin pasar por las tiendas con `eas update`.
