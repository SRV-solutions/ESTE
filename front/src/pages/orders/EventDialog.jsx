import { useEffect, useState } from 'react';
import FormDialog from '../../components/FormDialog';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';
import { toDateTimeInput } from '../../lib/format';
import EventFields from './EventFields';
import { EMPTY_EVENT, eventComplete } from './eventForm';

/** Alta (o edición) de un evento en un diálogo. */
const EventDialog = ({ open, onClose, onSaved, locations, event }) => {
  const { notify } = useFeedback();
  const [form, setForm] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(event ? { ...event, dateEvent: toDateTimeInput(event.dateEvent) } : EMPTY_EVENT);
  }, [open, event]);

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
      disabled={!eventComplete(form)}
      submitLabel={event ? 'Guardar' : 'Crear evento'}
    >
      <EventFields form={form} onChange={setForm} locations={locations} autoFocus />
    </FormDialog>
  );
};

export default EventDialog;
