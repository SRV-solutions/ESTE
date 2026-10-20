# Cobros y facturación de Event Box

Cada empresa paga **USD 400 por mes**, cobrados en pesos al **dólar blue** del momento del pago
(cotización de [dolarapi.com](https://dolarapi.com)). El pago se hace con **Mercado Pago** y,
cuando se acredita, Event Box emite automáticamente la **Factura C** en ARCA a tu nombre.

## Cómo funciona

1. El administrador de la empresa entra a **Mi empresa** y toca **Pagar con Mercado Pago**.
2. Event Box fija el monto en pesos (USD × blue, redondeado a la centena) y abre el checkout de Mercado Pago.
3. Mercado Pago avisa el pago a `POST /billing/mercadopago/webhook`. Event Box no confía en el aviso:
   consulta el pago real a Mercado Pago, verifica el monto y recién ahí lo aprueba.
4. La suscripción se extiende un mes y se emite la factura en ARCA. Si ARCA falla, el pago queda
   aprobado igual y la factura se reintenta desde **Panel SRV → empresa → Pagos y facturas**.

Si una empresa no paga, sigue entrando con un aviso durante `BILLING_GRACE_DAYS` (10 días). Después
se bloquea: solo su administrador puede entrar, y únicamente para pagar. Los datos no se tocan.

Para cobros por transferencia o en efectivo: **Panel SRV → empresa → Registrar pago**.

---

## Mercado Pago

1. Entrá a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/app) y creá una
   aplicación (producto: **Checkout Pro**).
2. En **Credenciales de producción** copiá el **Access Token** a `MP_ACCESS_TOKEN`.
   Para probar, usá primero las credenciales de prueba y usuarios de prueba.
3. En **Webhooks → Configurar notificaciones**:
   - URL de producción: `https://TU-API/billing/mercadopago/webhook`
   - Evento: **Pagos**
   - Copiá la **clave secreta** a `MP_WEBHOOK_SECRET` (con ella se valida que el aviso venga de Mercado Pago).
4. Definí `API_PUBLIC_URL` (URL pública de la API) y `APP_URL` (URL del front).

Sin `MP_ACCESS_TOKEN`, el botón de pago aparece deshabilitado con un aviso.

---

## ARCA: factura electrónica

ARCA tiene un servicio web oficial. Event Box lo usa directo, sin intermediarios pagos:

- **WSAA**: con tu certificado digital pide un ticket de acceso (dura 12 h).
- **WSFEv1**: con ese ticket pide el **CAE** de cada factura.

Hoy emite **Factura C**, la que corresponde a un monotributista. Si sos responsable inscripto,
avisá y se agrega la Factura A/B con IVA.

### 1. Generar la clave y el pedido de certificado

```bash
openssl genrsa -out eventbox.key 2048
openssl req -new -key eventbox.key -subj "/C=AR/O=TU NOMBRE/CN=eventbox/serialNumber=CUIT 20XXXXXXXXX" -out eventbox.csr
```

Guardá `eventbox.key` en un lugar seguro: es tu clave privada y **nunca** se sube al repositorio.

### 2. Probar en homologación (sin validez fiscal)

1. Entrá a ARCA con clave fiscal y adherí el servicio **"WSASS - Autogestión Certificados Homologación"**.
2. En WSASS: **Nuevo certificado** → pegá el contenido de `eventbox.csr` → descargá el `.crt`.
3. En WSASS: **Crear autorización a servicio** → servicio `wsfe` para ese certificado.
4. Configurá: `ARCA_CUIT`, `ARCA_CERT=ruta/al/eventbox.crt`, `ARCA_KEY=ruta/a/eventbox.key`,
   `ARCA_POINT_OF_SALE=1`, `ARCA_PRODUCTION=false`.
5. Registrá un pago manual desde el Panel SRV: se emite una factura de prueba. El PDF dice
   "HOMOLOGACIÓN — SIN VALIDEZ FISCAL".

### 3. Pasar a producción

1. En ARCA con clave fiscal: **Administración de Certificados Digitales** → agregá un alias,
   subí el mismo `.csr` (o uno nuevo) y descargá el `.crt` de producción.
2. **Administrador de Relaciones de Clave Fiscal** → nueva relación → servicio
   **"Facturación Electrónica"** (`wsfe`) → representante: el certificado que creaste.
3. **ABM de puntos de venta**: creá un punto de venta nuevo del tipo
   **"Factura Electrónica – Monotributo – Web Services"**. Usá su número en `ARCA_POINT_OF_SALE`.
4. Cambiá `ARCA_CERT` al certificado de producción y poné `ARCA_PRODUCTION=true`.
5. Completá los datos del emisor que se imprimen en la factura: `ARCA_ISSUER_NAME`,
   `ARCA_ISSUER_ADDRESS`, `ARCA_ISSUER_IIBB` y `ARCA_ISSUER_ACTIVITY_START`.

Cada factura lleva el **QR obligatorio de ARCA** (RG 4892) y se descarga desde **Mi empresa**
(la empresa cliente) o desde el **Panel SRV**.

### Receptor de la factura

- Si la empresa cargó su **CUIT** en Mi empresa, se factura a ese CUIT con su condición frente al IVA.
- Si no, se factura a **consumidor final**.
