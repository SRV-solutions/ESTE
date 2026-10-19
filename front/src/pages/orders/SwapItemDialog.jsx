import { useEffect, useState } from 'react';
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';

/** Reemplaza un ítem de la orden por otro libre de la misma categoría (ej: uno roto por uno sano). */
const SwapItemDialog = ({ orderId, item, onClose, onSwapped }) => {
  const { notify } = useFeedback();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setSelected(null);
    setLoading(true);
    api
      .get('/items/available', { params: { category: item.categoryId } })
      .then((r) => setOptions(r.data))
      .catch((err) => notify(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [item, notify]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/service-orders/${orderId}/items/${item.id}/swap`, { newItemId: selected.id });
      notify(`${item.code} reemplazado por ${selected.code}.`);
      onSwapped();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!item} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cambiar {item?.code}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Elegí otro ítem libre de {item?.Category?.name}.
          {item?.Category?.isContainer && ' Lo que cargaste dentro de este contenedor pasa al nuevo.'}
        </Typography>
        <Autocomplete
          options={options}
          loading={loading}
          value={selected}
          onChange={(_, v) => setSelected(v)}
          getOptionLabel={(o) => o.code}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          noOptionsText="No hay otro ítem libre de esta categoría"
          renderInput={(params) => <TextField {...params} label="Ítem nuevo" autoFocus />}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={save} variant="contained" disabled={!selected || saving}>
          {saving ? 'Cambiando…' : 'Cambiar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SwapItemDialog;
