import { useMemo, useRef, useState } from 'react';
import { Autocomplete, Box, Button, Chip, Grid, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import HistoryEduOutlined from '@mui/icons-material/HistoryEduOutlined';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader, StatTile } from '../../components/ui';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage, openPrivateFile } from '../../lib/api';
import { formatDateTime, userName } from '../../lib/format';
import { formatArs, periodLabel } from '../../lib/money';
import { KINDS, SLIP_STATUS, currentPeriod, kindLabel } from './payroll';

const UploadSlipDialog = ({ people, onClose, onSaved, preset }) => {
  const { notify } = useFeedback();
  const input = useRef(null);
  const [form, setForm] = useState({ person: preset || null, period: currentPeriod(), kind: 'mensual', grossAmount: '', netAmount: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('userId', form.person.id);
      data.append('period', form.period);
      data.append('kind', form.kind);
      if (form.grossAmount) data.append('grossAmount', form.grossAmount);
      if (form.netAmount) data.append('netAmount', form.netAmount);
      const { data: res } = await api.post('/payslips', data);
      const byMail = form.person.canLogin && form.person.email;
      notify(`${res.message} ${byMail ? 'Le avisamos por mail.' : 'No usa la app: lo firma en papel.'}`);
      onSaved();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open onClose={onClose} title="Cargar recibo de sueldo" onSubmit={save} saving={saving} disabled={!file || !form.person || !form.period} submitLabel="Cargar">
      <Autocomplete
        options={people}
        value={form.person}
        onChange={(_, v) => setForm((f) => ({ ...f, person: v }))}
        getOptionLabel={(p) => `${userName(p)}${p.cuil ? ` · ${p.cuil}` : ''}${p.access === 'none' ? ' · sin acceso' : ''}`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => <TextField {...params} label="Persona" required />}
      />
      <Stack direction="row" spacing={1.5}>
        <TextField type="month" label="Período" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ flex: 1 }} />
        <TextField select label="Tipo" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} sx={{ flex: 1 }}>
          {KINDS.map((k) => (
            <MenuItem key={k.value} value={k.value}>
              {k.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction="row" spacing={1.5}>
        <TextField label="Bruto (opcional)" value={form.grossAmount} onChange={(e) => setForm((f) => ({ ...f, grossAmount: e.target.value }))} inputProps={{ inputMode: 'decimal' }} sx={{ flex: 1 }} />
        <TextField label="Neto (opcional)" value={form.netAmount} onChange={(e) => setForm((f) => ({ ...f, netAmount: e.target.value }))} inputProps={{ inputMode: 'decimal' }} sx={{ flex: 1 }} />
      </Stack>
      <Button variant="outlined" startIcon={<UploadFileOutlined />} onClick={() => input.current?.click()} sx={{ alignSelf: 'flex-start' }}>
        {file ? file.name : 'Elegir PDF del recibo'}
      </Button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f && f.size > 25 * 1024 * 1024) return notify('El PDF pesa más de 25 MB.', 'error');
          if (f) setFile(f);
        }}
      />
      <Typography variant="caption" color="text.secondary">
        Si ya había un recibo sin firmar para ese período y tipo, se reemplaza. Uno firmado no se puede reemplazar.
      </Typography>
    </FormDialog>
  );
};

/** Recibos de sueldo del mes (plan Profesional). Las personas y sus datos laborales están en Equipo. */
const PayrollPage = () => {
  const { notify, confirm } = useFeedback();
  const [period, setPeriod] = useState(currentPeriod());
  const [uploading, setUploading] = useState(null); // {} o { preset: persona }

  const team = useLoader(() => api.get('/team').then((r) => r.data.people), []);
  const slips = useLoader(() => api.get('/payslips', { params: { period } }).then((r) => r.data), [period]);

  const counts = useMemo(() => {
    const list = slips.data || [];
    return { total: list.length, signed: list.filter((s) => s.status === 'signed').length, pending: list.filter((s) => s.status === 'pending').length, disputed: list.filter((s) => s.status === 'disputed').length };
  }, [slips.data]);

  const view = async (slip) => {
    try {
      await openPrivateFile(`/payslips/${slip.id}/file?view=1`, { view: true });
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const act = async (slip, { title, confirmLabel, danger, request, message }) => {
    if (!(await confirm({ title, message: `${userName(slip.Employee?.User)} · ${periodLabel(slip.period)}`, confirmLabel, danger }))) return;
    try {
      const { data } = await request();
      notify(data?.message || message);
      slips.reload();
      team.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  // Quien cobra sueldo (activo en nómina), y quiénes no tienen recibo en el período elegido.
  const people = (team.data || []).filter((p) => p.isActive);
  const missing = people.filter((p) => !(slips.data || []).some((s) => s.Employee?.userId === p.id));

  if (team.loading && !team.data) return <Loading />;
  if (team.error) return <ErrorState message={team.error} onRetry={team.reload} />;

  return (
    <>
      <PageHeader
        title="Sueldos"
        subtitle="Recibos de sueldo digitales con firma de conformidad. Las personas y sus datos laborales se cargan en Equipo."
        actions={
          <>
            <Button variant="outlined" component={RouterLink} to="/team">
              Ver equipo
            </Button>
            <Button variant="contained" startIcon={<UploadFileOutlined />} onClick={() => setUploading({})} disabled={!people.length}>
              Cargar recibo
            </Button>
          </>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
        <TextField type="month" label="Período" value={period} onChange={(e) => setPeriod(e.target.value || currentPeriod())} InputLabelProps={{ shrink: true }} sx={{ width: { sm: 200 } }} />
        <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
          {periodLabel(period)}
        </Typography>
      </Stack>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <StatTile label="Cargados" value={counts.total} hint={`${missing.length} sin recibo`} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Firmados" value={counts.signed} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Sin firmar" value={counts.pending} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Disconformidad" value={counts.disputed} accent={counts.disputed ? '#d32f2f' : undefined} />
        </Grid>
      </Grid>

      {slips.loading && !slips.data ? (
        <Loading />
      ) : (
        <Stack spacing={1}>
          {(slips.data || []).map((s) => (
            <Paper key={s.id} variant="outlined" sx={{ p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography sx={{ fontWeight: 800 }} noWrap>
                  {userName(s.Employee?.User)}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {kindLabel(s.kind)}
                  {s.netAmount ? ` · neto ${formatArs(s.netAmount)}` : ''}
                  {s.signedAt ? ` · firmado ${formatDateTime(s.signedAt)}` : ''}
                </Typography>
                {s.employeeComment && (
                  <Typography variant="caption" color={s.status === 'disputed' ? 'error.main' : 'text.secondary'} component="div">
                    “{s.employeeComment}”
                  </Typography>
                )}
              </Box>
              <Chip size="small" label={SLIP_STATUS[s.status].label} color={SLIP_STATUS[s.status].color} variant="outlined" />
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Ver PDF">
                  <IconButton size="small" onClick={() => view(s)}>
                    <VisibilityOutlined fontSize="small" />
                  </IconButton>
                </Tooltip>
                {s.status === 'pending' && (
                  <>
                    <Tooltip title="Firmado en papel">
                      <IconButton
                        size="small"
                        onClick={() =>
                          act(s, { title: 'Marcar como firmado en papel', confirmLabel: 'Marcar firmado', request: () => api.post(`/payslips/${s.id}/paper`) })
                        }
                      >
                        <HistoryEduOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        onClick={() => act(s, { title: 'Eliminar recibo', confirmLabel: 'Eliminar', danger: true, request: () => api.delete(`/payslips/${s.id}`), message: 'Recibo eliminado.' })}
                        sx={{ '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            </Paper>
          ))}
          {missing.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Sin recibo en {periodLabel(period)}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {missing.map((p) => (
                  <Chip key={p.id} label={userName(p)} onClick={() => setUploading({ preset: p })} icon={<UploadFileOutlined />} variant="outlined" />
                ))}
              </Stack>
            </Paper>
          )}
          {!slips.data?.length && !missing.length && <EmptyState title="No hay recibos en este período" />}
        </Stack>
      )}

      {uploading && (
        <UploadSlipDialog
          people={people}
          preset={uploading.preset}
          onClose={() => setUploading(null)}
          onSaved={() => {
            setUploading(null);
            slips.reload();
            team.reload();
          }}
        />
      )}
    </>
  );
};

export default PayrollPage;
