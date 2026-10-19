import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import UploadOutlined from '@mui/icons-material/UploadOutlined';
import { CompanyLogo } from '../../components/Brand';
import ImagePicker from '../../components/ImagePicker';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import { downloadInvoice, voucherLabel } from '../../lib/invoices';
import { ACCESS_STATE, PAYMENT_STATUS, formatArs, formatUsd, periodLabel } from '../../lib/money';
import { BRAND } from '../../theme';
import CompanyForm from './CompanyForm';
import { EMPTY_COMPANY } from './companyDefaults';

/** Logo de la empresa: aparece arriba a la izquierda para todo el equipo y en los PDF de órdenes. */
const LogoEditor = ({ company, onChanged }) => {
  const { notify, confirm } = useFeedback();
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  const run = async (request, message) => {
    setBusy(true);
    try {
      await request();
      notify(message);
      await refresh(); // La barra lateral muestra el logo nuevo al instante.
      onChanged();
    } catch (err) {
      notify(errorMessage(err, 'No se pudo actualizar el logo.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const upload = (file) => {
    const form = new FormData();
    form.append('file', file);
    run(() => api.post('/company/logo', form), 'Logo actualizado.');
  };

  const remove = async () => {
    if (await confirm({ title: 'Quitar el logo', confirmLabel: 'Quitar' })) run(() => api.delete('/company/logo'), 'Logo quitado.');
  };

  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'surface2' }}>
      <Box sx={{ opacity: busy ? 0.5 : 1 }}>
        <CompanyLogo company={company} size={64} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800 }}>Logo</Typography>
        <Typography variant="body2" color="text.secondary">
          PNG o JPG cuadrado, hasta 5 MB. Se ve arriba a la izquierda y en los PDF.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <ImagePicker size="small" variant="outlined" startIcon={<UploadOutlined />} onPick={upload} onError={(m) => notify(m, 'error')} disabled={busy}>
            {company.logoUrl ? 'Cambiar logo' : 'Subir logo'}
          </ImagePicker>
          {company.logoUrl && (
            <Button size="small" color="inherit" onClick={remove} disabled={busy}>
              Quitar
            </Button>
          )}
        </Stack>
      </Box>
    </Stack>
  );
};

const SubscriptionCard =({ data, onPay, paying }) => {
  const { subscription, quote, company, mercadoPagoEnabled } = data;
  const state = ACCESS_STATE[subscription.state];
  return (
    <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="overline" color="text.disabled">
            Suscripción a Event Box
          </Typography>
          <Typography variant="h5">{formatUsd(company.monthlyPriceUsd)} por mes</Typography>
        </Box>
        <Chip label={state.label} color={state.color} />
      </Stack>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {subscription.paidUntil ? `Paga hasta el ${formatDate(subscription.paidUntil)}.` : 'Sin pagos registrados.'}
      </Typography>

      {quote ? (
        <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'surface2' }}>
          <Typography variant="body2" color="text.secondary">
            Próximo pago · {quote.periodLabel}
          </Typography>
          <Typography sx={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', color: BRAND.orange }}>{formatArs(quote.amountArs)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatUsd(quote.amountUsd)} × dólar blue {formatArs(quote.rate.sell)} · cotización del {formatDateTime(quote.rate.updatedAt)}
          </Typography>
        </Box>
      ) : (
        <Alert severity="warning" sx={{ mt: 3 }}>
          No se pudo obtener la cotización del dólar en este momento. Probá de nuevo en unos minutos.
        </Alert>
      )}

      <Button
        fullWidth
        size="large"
        variant="contained"
        startIcon={<PaymentsOutlined />}
        sx={{ mt: 2 }}
        disabled={!mercadoPagoEnabled || !quote || paying}
        onClick={onPay}
      >
        {paying ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
      </Button>
      {!mercadoPagoEnabled && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          El cobro online todavía no está habilitado. Para pagar, contactá a SRV.
        </Typography>
      )}
    </Paper>
  );
};

const BillingPage = () => {
  const { notify } = useFeedback();
  const { refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);

  const { data, loading, error, reload } = useLoader(() => api.get('/billing').then((r) => r.data), []);

  useEffect(() => {
    if (data && !form) setForm({ ...EMPTY_COMPANY, ...Object.fromEntries(Object.entries(data.company).map(([k, v]) => [k, v ?? ''])) });
  }, [data, form]);

  // Vuelta desde Mercado Pago: el pago se confirma por webhook, así que se recarga a los pocos segundos.
  const mpStatus = params.get('status') || params.get('collection_status');
  useEffect(() => {
    if (!mpStatus) return;
    if (mpStatus === 'approved') notify('¡Pago recibido! En unos segundos se actualiza la suscripción.');
    else if (mpStatus === 'pending' || mpStatus === 'in_process') notify('El pago quedó pendiente de acreditación.', 'info');
    else notify('El pago no se completó.', 'warning');
    const t = setTimeout(() => {
      reload();
      refresh().catch(() => {});
      setParams({}, { replace: true });
    }, 4000);
    return () => clearTimeout(t);
  }, [mpStatus, notify, reload, refresh, setParams]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const pay = async () => {
    setPaying(true);
    try {
      const { data: res } = await api.post('/billing/checkout');
      window.location.assign(res.checkoutUrl);
    } catch (err) {
      notify(errorMessage(err), 'error');
      setPaying(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      // El logo se maneja aparte (LogoEditor): no se manda acá para no pisar uno recién subido.
      // eslint-disable-next-line no-unused-vars
      const { logoUrl, ...companyData } = form;
      await api.patch('/company', companyData);
      notify('Datos de la empresa guardados.');
      await refresh();
      reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Mi empresa" subtitle="Datos de la empresa, suscripción y facturas." />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <SubscriptionCard data={data} onPay={pay} paying={paying} />
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" component="form" onSubmit={save} noValidate sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Datos de la empresa
            </Typography>
            <LogoEditor company={data.company} onChanged={reload} />
            {form && <CompanyForm value={form} onChange={setForm} errors={errors} />}
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={saving || !form?.name?.trim()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Pagos
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mes</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{periodLabel(p.period)}</TableCell>
                    <TableCell align="right">{formatArs(p.amountArs)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={PAYMENT_STATUS[p.status]?.label} color={PAYMENT_STATUS[p.status]?.color} variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!data.payments.length && <EmptyState title="Todavía no hay pagos" />}
          </TableContainer>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Facturas
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Comprobante</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
                      {voucherLabel(inv)}
                    </TableCell>
                    <TableCell>{formatDate(inv.issuedAt)}</TableCell>
                    <TableCell align="right">{formatArs(inv.amountArs)}</TableCell>
                    <TableCell align="right" sx={{ width: 48 }}>
                      <Tooltip title="Descargar PDF">
                        <IconButton size="small" onClick={() => downloadInvoice(inv.id, notify)}>
                          <PictureAsPdfOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!data.invoices.length && (
              <EmptyState title="Todavía no hay facturas" description={data.invoicingEnabled ? undefined : 'Las facturas se emiten automáticamente con cada pago.'} />
            )}
          </TableContainer>
        </Grid>
      </Grid>
    </>
  );
};

export default BillingPage;
