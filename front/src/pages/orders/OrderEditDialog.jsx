import { useEffect, useState } from 'react';
import { Grid, MenuItem, TextField } from '@mui/material';
import FormDialog from '../../components/FormDialog';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';
import { toDateTimeInput, userName } from '../../lib/format';
import { ORDER_DATES, validateOrderDates } from './orderDates';

/** Edita responsables, fechas y observaciones de una orden. */
const OrderEditDialog = ({ open, onClose, order, users, onSaved }) => {
  const { notify } = useFeedback();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      checkedBy: order.checkedBy ?? '',
      deployedBy: order.deployedBy ?? '',
      observations: order.observations ?? '',
      ...Object.fromEntries(ORDER_DATES.map(({ key }) => [key, toDateTimeInput(order[key])])),
    });
  }, [open, order]);

  const errors = validateOrderDates(form);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, checkedBy: form.checkedBy || null, deployedBy: form.deployedBy || null };
      for (const { key } of ORDER_DATES) payload[key] = form[key] ? new Date(form[key]).toISOString() : null;
      await api.patch(`/service-orders/${order.id}`, payload);
      notify('Orden actualizada.');
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
      title={`Editar orden #${order.id}`}
      onSubmit={save}
      saving={saving}
      disabled={!!Object.keys(errors).length}
      maxWidth="md"
    >
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          {userSelect('checkedBy', 'Quién la chequea')}
        </Grid>
        <Grid item xs={12} sm={6}>
          {userSelect('deployedBy', 'Quién la arma')}
        </Grid>
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
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Observaciones"
            value={form.observations ?? ''}
            onChange={set('observations')}
            inputProps={{ maxLength: 255 }}
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
};

export default OrderEditDialog;
