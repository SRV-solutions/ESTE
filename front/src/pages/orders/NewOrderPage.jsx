import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import EventRepeatOutlined from '@mui/icons-material/EventRepeatOutlined';
import { ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';
import { eventLabel, formatDate, userName } from '../../lib/format';
import EventFields from './EventFields';
import { EMPTY_EVENT, eventComplete } from './eventForm';
import { ORDER_DATES, validateOrderDates } from './orderDates';

const Section = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {title}
    </Typography>
    {children}
  </Paper>
);

/** Desde hoy a las 00:00: los eventos que ya pasaron no se ofrecen (casi nunca se repiten). */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const NewOrderPage = () => {
  const { user, hasFeature, can } = useAuth();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const canCreateEvent = can('events', 'create');
  const presetEvent = Number(params.get('event')) || null; // Viene preelegido desde la pantalla de Eventos.
  // Casi todas las órdenes son de un evento nuevo (cada uno tiene su fecha): es lo primero que se ofrece.
  const [eventMode, setEventMode] = useState(presetEvent || !canCreateEvent ? 'existing' : 'new');
  const [newEvent, setNewEvent] = useState(EMPTY_EVENT);
  const [createdEvent, setCreatedEvent] = useState(null); // si la orden falla, no se crea el evento dos veces
  const [showPast, setShowPast] = useState(false);
  const [saving, setSaving] = useState(false);
  const stageOwners = hasFeature('stageOwners');
  const [form, setForm] = useState({
    eventId: presetEvent,
    orderedBy: user.id,
    checkedBy: '',
    deployedBy: '',
    logisticsBy: '',
    receptionBy: '',
    observations: '',
    incomeDate: '',
    assemblyDate: '',
    disassemblyDate: '',
    outcomeDate: '',
  });

  // Se cargan una sola vez (antes se volvían a pedir en cada tecla).
  const { data, loading, error, reload } = useLoader(async () => {
    const [users, events, locations] = await Promise.all([
      api.get('/users').then((r) => r.data),
      api.get('/events').then((r) => r.data),
      api.get('/locations').then((r) => r.data),
    ]);
    return { users, events, locations };
  }, []);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const today = startOfToday();
  const events = data.events.filter((e) => showPast || e.id === form.eventId || new Date(e.dateEvent) >= today);
  const selectedEvent = data.events.find((e) => e.id === form.eventId) || null;
  const dateErrors = validateOrderDates(form);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const eventReady = eventMode === 'new' ? eventComplete(newEvent) : !!form.eventId;

  /** Crea el evento nuevo (o actualiza el que quedó creado si la orden falló antes). */
  const saveNewEvent = async () => {
    const payload = { ...newEvent, dateEvent: new Date(newEvent.dateEvent).toISOString() };
    const { data: ev } = createdEvent
      ? await api.patch(`/events/${createdEvent.id}`, payload)
      : await api.post('/events', payload);
    setCreatedEvent(ev);
    return ev.id;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!eventReady || Object.keys(dateErrors).length) return;
    setSaving(true);
    try {
      const eventId = eventMode === 'new' ? await saveNewEvent() : form.eventId;
      const payload = { ...form, eventId };
      if (!stageOwners) {
        delete payload.logisticsBy;
        delete payload.receptionBy;
      }
      for (const { key } of ORDER_DATES) payload[key] = form[key] ? new Date(form[key]).toISOString() : null;
      const { data: order } = await api.post('/service-orders', payload);
      notify(`Orden #${order.id} creada. Ahora cargale los ítems.`);
      navigate(`/service-orders/${order.id}`);
    } catch (err) {
      notify(errorMessage(err), 'error');
      setSaving(false);
    }
  };

  const userSelect = (field, label, { required = false, disabled = false } = {}) => (
    <TextField select fullWidth label={label} value={form[field]} onChange={set(field)} required={required} disabled={disabled}>
      {!required && (
        <MenuItem value="">
          <em>Sin asignar</em>
        </MenuItem>
      )}
      {data.users.map((u) => (
        <MenuItem key={u.id} value={u.id}>
          {userName(u)} {u.Role ? `· ${u.Role.roleName}` : ''}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <PageHeader title="Nueva orden de servicio" subtitle="Cargá el evento y quiénes participan. Los ítems se cargan en el paso siguiente." />
      <Stack spacing={2}>
        <Section title="Evento">
          {canCreateEvent && (
            <ToggleButtonGroup
              exclusive
              size="small"
              color="primary"
              value={eventMode}
              onChange={(_, v) => v && setEventMode(v)}
              sx={{ mb: 2, flexWrap: 'wrap' }}
            >
              <ToggleButton value="new" sx={{ px: 2 }}>
                <Add fontSize="small" sx={{ mr: 0.75 }} />
                Evento nuevo
              </ToggleButton>
              <ToggleButton value="existing" sx={{ px: 2 }}>
                <EventRepeatOutlined fontSize="small" sx={{ mr: 0.75 }} />
                Uno ya cargado
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          {eventMode === 'new' ? (
            <>
              <EventFields form={newEvent} onChange={setNewEvent} locations={data.locations} columns={2} />
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
                El evento se crea junto con la orden y después lo ves en Eventos.
              </Typography>
            </>
          ) : (
            <>
              <Autocomplete
                fullWidth
                options={events}
                noOptionsText={showPast ? 'No hay eventos cargados' : 'No hay eventos próximos'}
                value={selectedEvent}
                onChange={(_, ev) => setForm((f) => ({ ...f, eventId: ev?.id ?? null }))}
                getOptionLabel={(ev) => `${eventLabel(ev)} — ${formatDate(ev.dateEvent)}`}
                renderOption={(props, ev) => (
                  <li {...props} key={ev.id}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{eventLabel(ev)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(ev.dateEvent)} · {ev.organizer} · {ev.finalClient}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => <TextField {...params} label="Buscar evento" required />}
              />
              <FormControlLabel
                sx={{ mt: 0.5 }}
                control={<Checkbox size="small" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />}
                label={<Typography variant="body2">Mostrar también eventos que ya pasaron</Typography>}
              />
            </>
          )}
        </Section>

        <Section title="Responsables">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              {userSelect('orderedBy', 'Creada por', { required: true, disabled: !user.isAdmin })}
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              {userSelect('checkedBy', 'Quién la chequea')}
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              {userSelect('deployedBy', 'Quién la arma')}
            </Grid>
            {stageOwners && (
              <>
                <Grid item xs={12} sm={6}>
                  {userSelect('logisticsBy', 'Logística y traslado')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {userSelect('receptionBy', 'Recepción y desarme')}
                </Grid>
              </>
            )}
          </Grid>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
            Cada responsable avanza el estado en su etapa. Si una etapa queda sin asignar, la avanza quien crea la orden.
          </Typography>
        </Section>

        <Section title="Fechas">
          <Grid container spacing={2}>
            {ORDER_DATES.map(({ key, label }) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label={label}
                  value={form[key]}
                  onChange={set(key)}
                  InputLabelProps={{ shrink: true }}
                  error={!!dateErrors[key]}
                  helperText={dateErrors[key]}
                />
              </Grid>
            ))}
          </Grid>
        </Section>

        <Section title="Observaciones">
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Indicaciones para el depósito, accesos, horarios…"
            value={form.observations}
            onChange={set('observations')}
            inputProps={{ maxLength: 255 }}
          />
        </Section>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button color="inherit" onClick={() => navigate('/service-orders')}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving || !eventReady || !!Object.keys(dateErrors).length}>
            {saving ? 'Creando…' : 'Crear y cargar ítems'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default NewOrderPage;
