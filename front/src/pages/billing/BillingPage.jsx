import { useEffect, useState } from 'react';
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import UploadOutlined from '@mui/icons-material/UploadOutlined';
import { CompanyLogo } from '../../components/Brand';
import ImagePicker from '../../components/ImagePicker';
import { ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/format';
import { formatArs, formatUsd, periodLabel } from '../../lib/money';
import { BRAND } from '../../theme';
import CompanyForm from './CompanyForm';
import PlansSection from './PlansSection';
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

/**
 * El abono del mes: se paga a principio de mes y habilita el uso de Event Box durante ese mes.
 * Por ahora el pago se coordina con SRV (no hay cobro online).
 */
const MonthCard = ({ month, plan }) => (
  <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
      <Box>
        <Typography variant="overline" color="text.disabled">
          Abono de {periodLabel(month.period)}
        </Typography>
        <Typography variant="h5">Plan {plan?.name}</Typography>
      </Box>
      <Chip label={month.paid ? 'Pagado' : 'Pendiente'} color={month.paid ? 'success' : 'warning'} />
    </Stack>

    {month.paid ? (
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'surface2' }}>
        <CheckCircleOutlined color="success" />
        <Typography>
          El mes está pago: pueden usar Event Box sin restricciones.
        </Typography>
      </Stack>
    ) : (
      <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'surface2' }}>
        <Typography variant="body2" color="text.secondary">
          Lo que deben de {periodLabel(month.period)}
        </Typography>
        <Typography sx={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', color: BRAND.orange }}>
          {month.amountArs ? formatArs(month.amountArs) : formatUsd(month.amountUsd)}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {formatUsd(month.amountUsd)}
          {month.rate ? ` × dólar blue ${formatArs(month.rate.sell)} · cotización del ${formatDateTime(month.rate.updatedAt)}` : ''}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 700 }}>
          Se paga a principio de mes. Vence el {formatDate(month.dueDate)}.
        </Typography>
      </Box>
    )}

    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
      Para pagar, coordiná con SRV. Apenas se registra el pago, el mes queda habilitado.
    </Typography>
  </Paper>
);

const BillingPage = () => {
  const { notify } = useFeedback();
  const { refresh, plan } = useAuth();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useLoader(() => api.get('/billing').then((r) => r.data), []);

  useEffect(() => {
    if (data && !form) setForm({ ...EMPTY_COMPANY, ...Object.fromEntries(Object.entries(data.company).map(([k, v]) => [k, v ?? ''])) });
  }, [data, form]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

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
      <PageHeader title="Mi empresa" subtitle="Datos de la empresa, abono del mes y plan." />

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <MonthCard month={data.month} plan={plan} />
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

      <PlansSection onChanged={reload} />
    </>
  );
};

export default BillingPage;
