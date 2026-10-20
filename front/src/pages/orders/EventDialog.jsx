import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link, MenuItem, TextField, Typography } from '@mui/material';
import FormDialog from '../../components/FormDialog';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';
import { toDateTimeInput } from '../../lib/format';

const EMPTY = { eventName: '', dateEvent: '', locationId: '', organizer: '', producer: '', finalClient: '' };

/** Alta (o edición) de un evento sin salir del formulario de la orden. */
const EventDialog = ({ open, onClose, onSaved, locations, event }) => {
  const { notify } = useFeedback();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(event ? { ...event, dateEvent: toDateTimeInput(event.dateEvent) } : EMPTY);
  }, [open, event]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const complete = Object.keys(EMPTY).every((k) => String(form[k] ?? '').trim());

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, dateEvent: new Date(form.dateEvent).toISOString() };
      const { data } = event
        ? await api.patch(`/events/${event.id}`, payload)
        : await api.post('/events', payload);
      notify(event ? 'Evento actualizado.' : 'Evento creado.');
      onSaved(data);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={event ? 'Editar evento' : 'Nuevo evento'}
      onSubmit={save}
      saving={saving}
      disabled={!complete}
      submitLabel={event ? 'Guardar' : 'Crear evento'}
    >
      <TextField label="Nombre del evento" value={form.eventName} onChange={set('eventName')} required autoFocus />
      <TextField
        label="Fecha y hora"
        type="datetime-local"
        value={form.dateEvent}
        onChange={set('dateEvent')}
        InputLabelProps={{ shrink: true }}
        required
      />
      <TextField select label="Lugar" value={form.locationId} onChange={set('locationId')} required>
        {locations.map((l) => (
          <MenuItem key={l.id} value={l.id}>
            {l.locationName} — {l.city}
          </MenuItem>
        ))}
      </TextField>
      {!locations.length && (
        <Typography variant="body2" color="text.secondary">
          Todavía no hay lugares cargados.{' '}
          <Link component={RouterLink} to="/locations">
            Crear un lugar
          </Link>
        </Typography>
      )}
      <TextField label="Organizador / empresa" value={form.organizer} onChange={set('organizer')} required />
      <TextField label="Productor / contacto" value={form.producer} onChange={set('producer')} required />
      <TextField label="Cliente final" value={form.finalClient} onChange={set('finalClient')} required />
    </FormDialog>
  );
};

export default EventDialog;
