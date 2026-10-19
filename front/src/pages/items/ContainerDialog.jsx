import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';

/** Contenido fijo de un contenedor: lo que viaja siempre adentro (ej: los cables de un baúl). */
const ContainerDialog = ({ container, canEdit, onClose, onChanged }) => {
  const { notify, confirm } = useFeedback();
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!container || !canEdit) return;
    setSelected([]);
    setLoading(true);
    api
      .get('/items/available/storable')
      .then((r) => setAvailable(r.data))
      .catch((err) => notify(errorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [container, canEdit, notify]);

  if (!container) return null;

  const assign = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/containers/contents', {
        itemIdParent: container.id,
        itemIdsChild: selected.map((i) => i.id),
      });
      notify(data.message);
      onChanged();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (child) => {
    const ok = await confirm({ title: `Sacar ${child.code} de ${container.code}`, confirmLabel: 'Sacar' });
    if (!ok) return;
    try {
      await api.delete(`/containers/${container.id}/contents/${child.id}`);
      notify(`${child.code} quedó suelto en el depósito.`);
      onChanged();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const empty = async () => {
    const ok = await confirm({
      title: `Vaciar ${container.code}`,
      message: `Los ${container.contents.length} ítems quedan sueltos en el depósito.`,
      confirmLabel: 'Vaciar',
      danger: true,
    });
    if (!ok) return;
    try {
      const { data } = await api.delete(`/containers/${container.id}/contents`);
      notify(data.message);
      onChanged();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {container.code}
        <Typography variant="body2" color="text.secondary">
          {container.Category?.name} · contenido fijo
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {container.contents.length ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {container.contents.map((c) => (
                <Chip key={c.id} label={c.code} title={c.Category?.name} onDelete={canEdit ? () => remove(c) : undefined} />
              ))}
            </Box>
          ) : (
            <Alert severity="info">
              No tiene contenido fijo. Mientras esté vacío, en cada orden se le pueden cargar ítems solo para ese evento.
            </Alert>
          )}
          {canEdit && (
            <Autocomplete
              multiple
              options={available}
              loading={loading}
              value={selected}
              onChange={(_, v) => setSelected(v)}
              filterSelectedOptions
              getOptionLabel={(i) => `${i.code} · ${i.Category?.name}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              filterOptions={(opts, { inputValue }) => {
                const q = inputValue.trim().toLowerCase();
                return (q ? opts.filter((i) => `${i.code} ${i.Category?.name}`.toLowerCase().includes(q)) : opts).slice(0, 100);
              }}
              renderInput={(params) => <TextField {...params} label="Guardar ítems adentro" helperText="Solo ítems almacenables y libres." />}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {canEdit && container.contents.length > 0 && (
          <Button onClick={empty} color="error" sx={{ mr: 'auto' }}>
            Vaciar
          </Button>
        )}
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        {canEdit && (
          <Button variant="contained" onClick={assign} disabled={!selected.length || saving}>
            {saving ? 'Guardando…' : `Guardar ${selected.length || ''}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ContainerDialog;
