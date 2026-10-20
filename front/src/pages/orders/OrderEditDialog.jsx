import { useEffect, useState } from 'react';
import { Grid, MenuItem, TextField, Typography } from '@mui/material';
import FormDialog from '../../components/FormDialog';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';
import { toDateTimeInput, userName } from '../../lib/format';
import { ORDER_DATES, RESPONSIBLES, validateOrderDates } from './orderDates';

/**
 * Edita una orden. Con `responsiblesOnly` solo reasigna responsables (se puede durante todo el
 * recorrido); si no, también fechas y observaciones (solo mientras la orden se puede editar).
 */
const OrderEditDialog = ({ open, onClose, order, users, onSaved, responsiblesOnly = false, stageOwners = false }) => {
  const { notify } = useFeedback();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const fields = RESPONSIBLES.filter((r) => r.field !== 'orderedBy' && (!r.stageOwner || stageOwners));

  useEffect(() => {
    if (!open) return;
    setForm({
      ...Object.fromEntries(fields.map((r) => [r.field, order[r.field] ?? ''])),
      ...(responsiblesOnly
        ? {}
        : {
            observations: order.observations ?? '',
            ...Object.fromEntries(ORDER_DATES.map(({ key }) => [key, toDateTimeInput(order[key])])),
          }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order, responsiblesOnly, stageOwners]);

  const errors = responsiblesOnly ? {} : validateOrderDates(form);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      for (const r of fields) payload[r.field] = form[r.field] || null;
      if (!responsiblesOnly) for (const { key } of ORDER_DATES) payload[key] = form[key] ? new Date(form[key]).toISOString() : null;
      await api.patch(`/service-orders/${order.id}`, payload);
      notify(responsiblesOnly ? 'Responsables actualizados.' : 'Orden actualizada.');
      onSaved();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const userSelect = (field, label) => (
    <TextField select fullWidth label={label} value={form[field] ?? ''} onChange={set(field)}>
      <MenuItem value="">
        <em>Sin asignar</em>
      </MenuItem>
      {users.map((u) => (
        <MenuItem key={u.id} value={u.id}>
          {userName(u)}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={responsiblesOnly ? `Responsables de la orden #${order.id}` : `Editar orden #${order.id}`}
      onSubmit={save}
      saving={saving}
      disabled={!!Object.keys(errors).length}
      maxWidth="md"
    >
      <Grid container spacing={2}>
        {fields.map((r) => (
          <Grid item xs={12} sm={6} key={r.field}>
            {userSelect(r.field, r.label)}
          </Grid>
        ))}
        {responsiblesOnly ? (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Cada responsable avanza el estado en su etapa. Si una etapa queda sin asignar, la avanza quien creó la orden.
            </Typography>
          </Grid>
        ) : (
          <>
            {ORDER_DATES.map(({ key, label }) => (
              <Grid item xs={12} sm={6} key={key}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label={label}
                  value={form[key] ?? ''}
                  onChange={set(key)}
                  InputLabelProps={{ shrink: true }}
                  error={!!errors[key]}
                  helperText={errors[key]}
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Observaciones" value={form.observations ?? ''} onChange={set('observations')} />
            </Grid>
          </>
        )}
      </Grid>
    </FormDialog>
  );
};

export default OrderEditDialog;
