import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import HandshakeOutlined from '@mui/icons-material/HandshakeOutlined';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatDate, userName } from '../../lib/format';
import { downloadInvoice, voucherLabel } from '../../lib/invoices';
import { PLAN_OPTIONS } from '../../lib/plans';
import { ACCESS_STATE, PAYMENT_STATUS, formatArs, formatUsd, periodLabel, taxConditionLabel } from '../../lib/money';
import CompanyForm from '../billing/CompanyForm';
import DealDialog from './DealDialog';
import { EMPTY_COMPANY } from '../billing/companyDefaults';

const Field = ({ label, value }) => (
  <Stack spacing={0.25}>
    <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {value || '—'}
    </Typography>
  </Stack>
);

const EditDialog = ({ company, onClose, onSaved }) => {
  const { notify } = useFeedback();
  const [form, setForm] = useState(() => ({
    ...EMPTY_COMPANY,
    ...Object.fromEntries(Object.entries(company).map(([k, v]) => [k, v ?? ''])),
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      // El logo lo maneja cada empresa: no se manda para no pisar uno recién subido.
      // eslint-disable-next-line no-unused-vars
      const { logoUrl, ...data } = form;
      await api.patch(`/platform/companies/${company.id}`, { ...data, paidUntil: form.paidUntil || null });
      notify('Empresa actualizada.');
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open onClose={onClose} title={`Editar ${company.name}`} onSubmit={save} saving={saving} disabled={!form.name.trim()} maxWidth="md">
      <CompanyForm value={form} onChange={setForm} errors={errors} />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            label="Plan"
            value={form.plan || 'profesional'}
            onChange={(e) => {
              const p = PLAN_OPTIONS.find((o) => o.id === e.target.value);
              setForm({ ...form, plan: p.id, monthlyPriceUsd: p.priceUsd });
            }}
          >
            {PLAN_OPTIONS.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} · {p.maxUsers} usuarios
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Precio mensual (USD)"
            value={form.monthlyPriceUsd}
            onChange={(e) => setForm({ ...form, monthlyPriceUsd: e.target.value })}
            inputProps={{ min: 0 }}
            helperText="El del plan, o uno especial"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            type="date"
            label="Paga hasta"
            value={form.paidUntil}
            onChange={(e) => setForm({ ...form, paidUntil: e.target.value })}
            InputLabelProps={{ shrink: true }}
            helperText="Para extender una prueba o corregir a mano"
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
};

const PlatformCompanyPage = () => {
  const { id } = useParams();
  const { notify, confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: company, loading, error, reload } = useLoader(() => api.get(`/platform/companies/${id}`).then((r) => r.data), [id]);

  if (loading && !company) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const act = async (fn, success) => {
    setBusy(true);
    try {
      const { data } = await fn();
      notify(typeof success === 'function' ? success(data) : success);
      reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleSuspend = async () => {
    const suspend = company.status === 'active';
    const ok = await confirm({
      title: suspend ? `Suspender ${company.name}` : `Reactivar ${company.name}`,
      message: suspend ? 'Nadie de la empresa va a poder usar Event Box hasta que la reactives. No se borra nada.' : undefined,
      confirmLabel: suspend ? 'Suspender' : 'Reactivar',
      danger: suspend,
    });
    if (ok) act(() => api.patch(`/platform/companies/${company.id}`, { status: suspend ? 'suspended' : 'active' }), suspend ? 'Empresa suspendida.' : 'Empresa reactivada.');
  };

  const manualPayment = async () => {
    const ok = await confirm({
      title: 'Registrar pago manual',
      message: 'Se registra un mes pago al dólar blue de hoy (transferencia, efectivo…) y, si ARCA está configurado, se emite la factura.',
      confirmLabel: 'Registrar pago',
    });
    if (ok)
      act(
        () => api.post(`/platform/companies/${company.id}/payments`, { invoice: true }),
        (d) => `Pago registrado (${formatArs(d.payment.amountArs)}).${d.invoice ? (d.invoice.status === 'issued' ? ' Factura emitida.' : ` Factura con error: ${d.invoice.error}`) : ''}`,
      );
  };

  const state = ACCESS_STATE[company.subscription.state];

  return (
    <>
      <PageHeader
        overline="Empresa"
        title={company.name}
        subtitle={<Chip size="small" label={state.label} color={state.color} sx={{ mt: 0.5 }} />}
        actions={
          <>
            <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant="outlined" color="secondary" startIcon={<HandshakeOutlined />} onClick={() => setDealing(true)}>
              Acuerdo especial
            </Button>
            <Button variant="outlined" color={company.status === 'active' ? 'error' : 'success'} onClick={toggleSuspend} disabled={busy}>
              {company.status === 'active' ? 'Suspender' : 'Reactivar'}
            </Button>
            <Button variant="contained" startIcon={<PaymentsOutlined />} onClick={manualPayment} disabled={busy}>
              Registrar pago
            </Button>
          </>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Stack spacing={1.5}>
              <Field label="Razón social" value={company.legalName} />
              <Field label="CUIT" value={company.cuit} />
              <Field label="Condición IVA" value={taxConditionLabel(company.taxCondition)} />
              <Field label="Email" value={company.email} />
              <Field label="Teléfono · dirección" value={[company.phone, company.address].filter(Boolean).join(' · ')} />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Stack spacing={1.5}>
              <Field label="Plan y precio de lista" value={`${PLAN_OPTIONS.find((p) => p.id === company.plan)?.name ?? company.plan} · ${formatUsd(company.monthlyPriceUsd)} por mes`} />
              {company.effective?.deal && (
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Acuerdo especial
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip size="small" color={company.effective.deal.active ? 'secondary' : 'default'} label={company.effective.deal.active ? 'Vigente' : company.effective.deal.from && company.effective.deal.from > new Date().toISOString().slice(0, 10) ? 'Empieza más adelante' : 'Vencido'} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatUsd(company.effective.deal.priceUsd)} por mes · {company.effective.deal.features.length} módulos · {company.effective.deal.maxUsers} usuarios
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {company.effective.deal.from ? `Del ${formatDate(company.effective.deal.from)}` : 'Desde siempre'} {company.effective.deal.until ? `al ${formatDate(company.effective.deal.until)}` : '· sin vencimiento'}
                    {company.effective.deal.note ? ` · ${company.effective.deal.note}` : ''}
                  </Typography>
                </Stack>
              )}
              <Field label="Paga hasta" value={formatDate(company.paidUntil)} />
              <Field label="Se bloquea" value={company.subscription.blocksOn ? formatDate(company.subscription.blocksOn) : '—'} />
              <Field label="Cliente desde" value={formatDate(company.createdAt)} />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Administradores
            </Typography>
            <Stack spacing={1}>
              {company.admins.map((a) => (
                <div key={a.id}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {userName(a)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    @{a.username} · {a.email}
                  </Typography>
                </div>
              ))}
              {!company.admins.length && <Typography color="text.secondary">Sin administradores.</Typography>}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Pagos y facturas
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Mes</TableCell>
              <TableCell>Medio</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell align="right">Dólar</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Factura</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {company.payments.map((p) => {
              const inv = p.Invoice;
              const canInvoice = p.status === 'approved' && inv?.status !== 'issued';
              return (
                <TableRow key={p.id}>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{periodLabel(p.period)}</TableCell>
                  <TableCell>{p.method === 'manual' ? 'Manual' : 'Mercado Pago'}</TableCell>
                  <TableCell align="right">{formatArs(p.amountArs)}</TableCell>
                  <TableCell align="right">{formatArs(p.exchangeRate)}</TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={PAYMENT_STATUS[p.status]?.label} color={PAYMENT_STATUS[p.status]?.color} />
                  </TableCell>
                  <TableCell>
                    {inv?.status === 'issued' ? (
                      <Typography variant="body2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                        {voucherLabel(inv)}
                      </Typography>
                    ) : inv?.status === 'failed' ? (
                      <Tooltip title={inv.error || ''}>
                        <Chip size="small" color="error" label="Error al facturar" />
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {inv?.status === 'issued' && (
                      <Tooltip title="Descargar factura">
                        <IconButton size="small" onClick={() => downloadInvoice(inv.id, notify)}>
                          <PictureAsPdfOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canInvoice && (
                      <Tooltip title={inv ? 'Reintentar factura' : 'Emitir factura'}>
                        <IconButton
                          size="small"
                          disabled={busy}
                          onClick={() =>
                            act(() => api.post(`/platform/payments/${p.id}/invoice`), (d) => (d.status === 'issued' ? 'Factura emitida.' : `ARCA: ${d.error}`))
                          }
                        >
                          <ReplayOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!company.payments.length && <EmptyState title="Sin pagos todavía" />}
      </TableContainer>

      {dealing && (
        <DealDialog
          company={company}
          onClose={() => setDealing(false)}
          onSaved={() => {
            setDealing(false);
            reload();
          }}
        />
      )}
      {editing && (
        <EditDialog
          company={company}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}
    </>
  );
};

export default PlatformCompanyPage;
