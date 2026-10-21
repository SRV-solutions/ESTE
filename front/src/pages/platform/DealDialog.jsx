import { useState } from 'react';
import { Alert, Button, Checkbox, Chip, FormControlLabel, Grid, Stack, TextField, Typography } from '@mui/material';
import FormDialog from '../../components/FormDialog';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatUsd } from '../../lib/money';
import { PLAN_OPTIONS } from '../../lib/plans';

/**
 * Acuerdo especial de SRV con una empresa: por un período, un precio propio por mes, los módulos
 * que SRV decida (sin importar el plan) y límites propios. Al vencer, vuelve a su plan.
 */
const DealDialog = ({ company, onClose, onSaved }) => {
  const { notify, confirm } = useFeedback();
  const { data: plans } = useLoader(() => api.get('/plans').then((r) => r.data), []);
  const deal = company.effective?.deal;
  const planName = PLAN_OPTIONS.find((p) => p.id === company.plan)?.name ?? company.plan;
  const [form, setForm] = useState(() => ({
    from: deal?.from || new Date().toISOString().slice(0, 10),
    until: deal?.until || '',
    priceUsd: deal?.priceUsd ?? company.monthlyPriceUsd ?? '',
    features: deal?.features || null, // null = todos
    maxUsers: deal?.maxUsers ?? '',
    maxTemporary: deal?.maxTemporary ?? '',
    note: deal?.note || '',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const allFeatures = plans ? Object.keys(plans.features) : [];
  const selected = form.features ?? allFeatures;
  const everything = form.features === null || selected.length === allFeatures.length;

  const toggle = (f) => setForm((s) => ({ ...s, features: selected.includes(f) ? selected.filter((x) => x !== f) : [...selected, f] }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        from: form.from || null,
        until: form.until || null,
        priceUsd: Number(form.priceUsd),
        features: everything ? allFeatures : selected,
        maxUsers: form.maxUsers || null,
        maxTemporary: form.maxTemporary || null,
        note: form.note,
      };
      await api.patch(`/platform/companies/${company.id}`, { deal: payload });
      notify('Acuerdo guardado.');
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Quitar el acuerdo', message: `${company.name} vuelve a su plan ${planName} y a su precio de lista.`, confirmLabel: 'Quitar', danger: true }))) return;
    setSaving(true);
    try {
      await api.patch(`/platform/companies/${company.id}`, { deal: null });
      notify('Acuerdo quitado.');
      onSaved();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open onClose={onClose} title={`Acuerdo especial · ${company.name}`} onSubmit={save} saving={saving} disabled={form.priceUsd === '' || Number(form.priceUsd) < 0} submitLabel="Guardar acuerdo" maxWidth="md">
      <Typography variant="body2" color="text.secondary">
        Durante el período, la empresa paga este precio por mes y usa los módulos que marques, sin importar su plan. Cuando termina, vuelve a su plan {planName} y a {formatUsd(company.monthlyPriceUsd)} por mes.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth type="number" label="Precio por mes (USD)" value={form.priceUsd} onChange={(e) => setForm({ ...form, priceUsd: e.target.value })} inputProps={{ min: 0 }} error={!!errors.priceUsd} helperText={errors.priceUsd || 'Puede ser 0 (sin cargo)'} required />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth type="date" label="Desde" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth type="date" label="Hasta" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} InputLabelProps={{ shrink: true }} error={!!errors.until} helperText={errors.until || 'Vacío: sin vencimiento'} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth type="number" label="Máximo de usuarios de la app" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} inputProps={{ min: 1 }} helperText="Vacío: el del plan" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth type="number" label="Máximo de accesos temporales" value={form.maxTemporary} onChange={(e) => setForm({ ...form, maxTemporary: e.target.value })} inputProps={{ min: 1 }} helperText="Vacío: el del plan" />
        </Grid>
      </Grid>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="subtitle2">Módulos incluidos</Typography>
        <Button size="small" onClick={() => setForm({ ...form, features: everything ? [] : null })}>
          {everything ? 'Desmarcar todos' : 'Todos'}
        </Button>
      </Stack>
      <Grid container>
        {allFeatures.map((f) => (
          <Grid item xs={12} sm={6} key={f}>
            <FormControlLabel
              control={<Checkbox size="small" checked={selected.includes(f)} onChange={() => toggle(f)} />}
              label={
                <span>
                  {plans.features[f]}
                  {plans.inDevelopment.includes(f) && <Chip label="En desarrollo" size="small" sx={{ ml: 0.75, height: 18, fontSize: 10 }} />}
                </span>
              }
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 14 } }}
            />
          </Grid>
        ))}
      </Grid>
      <TextField fullWidth multiline minRows={2} label="Nota interna (solo la ve SRV)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Por qué se acordó, con quién, condiciones…" />
      {deal && (
        <Alert severity="warning" action={<Button color="inherit" size="small" onClick={remove} disabled={saving}>Quitar acuerdo</Button>}>
          Hay un acuerdo cargado{deal.active ? ' y vigente' : ' (no vigente hoy)'}. Guardar lo reemplaza.
        </Alert>
      )}
    </FormDialog>
  );
};

export default DealDialog;
