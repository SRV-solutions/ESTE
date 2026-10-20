# Archivos (Cloudflare R2) y mails (Resend)

## Cloudflare R2: archivos

Event Box usa **dos buckets**:

| Bucket | Qué guarda | Acceso |
|---|---|---|
| `eventbox-public` | Logos de las empresas, fotos de perfil, capturas de los reportes | **Público** (dominio propio o r2.dev) |
| `eventbox-private` | Recibos de sueldo y planos | **Privado**: sin dominio público. Los entrega la API solo a quien tiene permiso |

Van separados porque, si el bucket tiene dominio público, cualquier archivo es accesible por URL.
Los recibos nunca pueden estar ahí.

Sin R2 configurado, todo va a disco (`api/uploads` y `api/private-uploads`). Eso sirve para
desarrollo, pero **no para producción**: si el servidor se reinstala, se pierden.

La subida pasa por multer (`api/src/middlewares/upload.ts`): en memoria, con límite de tamaño y de
cantidad, y descartando por tipo antes de leer el archivo. Después la API valida el contenido real
(los primeros bytes), no solo la extensión. SVG no se acepta, porque puede llevar código.

| Archivo | Tipos | Máximo |
|---|---|---|
| Logo, foto de perfil, captura | PNG, JPG, WEBP, GIF | 5 MB |
| Recibo de sueldo | PDF | 25 MB |
| Plano | PDF, PNG, JPG, WEBP, DWG | 25 MB |
| Importación de stock | CSV | 5 MB |

Las descargas de documentos privados salen de R2 hacia el usuario por streaming, sin cargar el
archivo entero en la memoria de la API.

### Configuración

1. En Cloudflare → **R2** → **Create bucket**, creá los dos: `eventbox-public` y `eventbox-private`
   (location automática, clase Standard).
2. En `eventbox-public` → **Settings** → **Public access**:
   - Conectá un dominio propio (recomendado, por ejemplo `archivos.wearesrv.com`), o
   - Habilitá el dominio `r2.dev` (sirve para empezar, con límite de tráfico).
   Ese dominio va en `R2_PUBLIC_URL`, sin barra final.
3. En `eventbox-public` → **Settings** → **CORS policy**, pegá esto. Hace falta para que el logo entre en los PDF:
   ```json
   [
     {
       "AllowedOrigins": ["https://este.wearesrv.com", "http://localhost:5173"],
       "AllowedMethods": ["GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```
4. **No** le actives acceso público a `eventbox-private` (ni dominio ni r2.dev), y no le hace falta CORS.
5. En **R2** → **Manage R2 API Tokens** → **Create API token** con permiso
   **Object Read & Write**, limitado a esos dos buckets. Copiá:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   - El **Account ID** (aparece en la URL del endpoint) → `R2_ACCOUNT_ID`
6. `R2_PUBLIC_BUCKET=eventbox-public` y `R2_PRIVATE_BUCKET=eventbox-private`.

R2 se activa solo si están las seis variables. Si falta alguna, la API sigue guardando en disco.

Estructura:

```
eventbox-public/
  empresas/<id>/logo-<aleatorio>.png
  usuarios/<id>/avatar-<aleatorio>.jpg
  feedback/<id-empresa>/captura-<aleatorio>.png
eventbox-private/
  privado/empresas/<id>/recibos/<ficha>/<aleatorio>.pdf
  privado/empresas/<id>/planos/<aleatorio>.<ext>
```

Cada imagen pública tiene un nombre único, así que se cachea por un año. Al reemplazar un logo o
una foto, se borra la anterior.

---

## Resend: mails

Event Box manda estos mails:

| Mail | A quién |
|---|---|
| Recuperar contraseña (link de 1 hora, un solo uso) | El usuario que lo pidió |
| Bienvenida al crear una empresa (usuario y link, **sin** la contraseña) | El administrador nuevo |
| Pago recibido (con el número de factura si se emitió) | Los administradores y el email de facturación de la empresa |
| Recibo de sueldo nuevo (link para verlo y firmarlo) | La persona, si usa la app |
| Reporte de un problema | `SUPPORT_EMAIL` (el equipo de SRV) |

Sin `RESEND_API_KEY` no se envía nada: el mail se registra en la consola de la API. En desarrollo,
el link de recuperación de contraseña también se imprime en la consola.

### Configuración

1. Creá una cuenta en [resend.com](https://resend.com).
2. **Domains** → **Add domain** → `wearesrv.com` (o un subdominio como `mail.wearesrv.com`).
   Cargá en tu DNS los registros que te muestra (SPF, DKIM) y esperá a que diga **Verified**.
3. **API Keys** → **Create API key** (permiso *Sending access*) → `RESEND_API_KEY`.
4. `EMAIL_FROM` tiene que usar el dominio verificado, por ejemplo `Event Box <no-reply@wearesrv.com>`.
5. `SUPPORT_EMAIL` = adónde querés recibir los reportes de problemas.
