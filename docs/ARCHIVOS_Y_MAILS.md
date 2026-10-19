# Archivos (Cloudflare R2) y mails (Resend)

## Cloudflare R2: imágenes

Event Box guarda en R2 los **logos de las empresas**, las **fotos de perfil** y las **capturas de los reportes**.
Sin R2 configurado, las imágenes van a la carpeta `api/uploads` y las sirve la propia API. Eso
sirve para desarrollo, pero **no para producción**: si el servidor se reinstala, se pierden.

Se aceptan PNG, JPG, WEBP y GIF de hasta 5 MB. La API valida el contenido real del archivo, no
solo la extensión. SVG no se acepta, porque puede llevar código.

### Configuración

1. En Cloudflare → **R2** → **Create bucket** (por ejemplo `eventbox`).
2. En el bucket → **Settings** → **Public access**:
   - Conectá un dominio propio (por ejemplo `archivos.wearesrv.com`), o
   - Habilitá el dominio `r2.dev` (sirve para empezar).
   Ese dominio va en `R2_PUBLIC_URL`, sin barra final.
3. En el bucket → **Settings** → **CORS policy**, pegá esto. Hace falta para que el logo entre en los PDF:
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
4. En **R2** → **Manage R2 API Tokens** → **Create API token** con permiso
   **Object Read & Write** solo sobre ese bucket. Copiá:
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
   - El **Account ID** (aparece en la URL del endpoint) → `R2_ACCOUNT_ID`
5. `R2_BUCKET` = nombre del bucket.

Estructura de las imágenes:

```
empresas/<id>/logo-<aleatorio>.png
usuarios/<id>/avatar-<aleatorio>.jpg
feedback/<id-empresa>/captura-<aleatorio>.png
```

Cada archivo tiene un nombre único, así que se cachea por un año. Al reemplazar un logo o una foto,
se borra la anterior.

---

## Resend: mails

Event Box manda estos mails:

| Mail | A quién |
|---|---|
| Recuperar contraseña (link de 1 hora, un solo uso) | El usuario que lo pidió |
| Bienvenida al crear una empresa (usuario y link, **sin** la contraseña) | El administrador nuevo |
| Pago recibido (con el número de factura si se emitió) | Los administradores y el email de facturación de la empresa |
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
