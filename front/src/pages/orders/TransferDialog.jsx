import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, TextField, Typography } from '@mui/material';
import FormDialog from '../../components/FormDialog';
import { StatusChip } from '../../components/ui';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';
import { eventLabel, formatDate } from '../../lib/format';

/**
 * Pasa todo el material de esta orden (que ya está en un evento) directo a otra orden,
 * sin volver al depósito. Esta orden queda cerrada con el enlace a la nueva.
 */
const TransferDialog = ({ order, open, onClose, onDone }) => {
  const { notify } = useFeedback();
  const [orders, setOrders] = useState([]);
  const [target, setTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTarget(null);
    api
      .get('/service-orders')
      .then((r) => setOrders(r.data))
      .catch((err) => notify(errorMessage(err), 'error'));
  }, [open, notify]);

  const options = useMemo(() => orders.filter((o) => o.id !== order.id && o.status !== 'disassembled'), [orders, order.id]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/service-orders/${order.id}/transfer`, { targetOrderId: target.id });
      notify(data.message);
      onDone(data.targetId);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open={open} onClose={onClose} title="Pasar el material a otro evento" onSubmit={save} saving={saving} disabled={!target} submitLabel="Pasar material">
      <Typography variant="body2" color="text.secondary">
        Todo el material de la orden #{order.id} ({order.items.length} ítems) pasa directo a la orden que elijas, sin volver al depósito.
        Esta orden queda cerrada con el enlace a la nueva.
      </Typography>
      <Autocomplete
        options={options}
        value={target}
        onChange={(_, v) => setTarget(v)}
        getOptionLabel={(o) => `#${o.id} · ${eventLabel(o.Event)}`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderOption={(props, o) => (
          <li {...props} key={o.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  #{o.id} · {eventLabel(o.Event)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(o.Event?.dateEvent)}
                </Typography>
              </Box>
              <StatusChip status={o.status} />
            </Box>
          </li>
        )}
        noOptionsText="No hay otras órdenes en curso. Creá primero la orden del evento siguiente."
        renderInput={(params) => <TextField {...params} label="Orden de destino" autoFocus />}
      />
      <Alert severity="info">Tenés que ser responsable también en la orden de destino (o administrador).</Alert>
    </FormDialog>
  );
};

export default TransferDialog;
