import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Autocomplete, Box, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import { ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';
import { eventLabel, formatDate, userName } from '../../lib/format';
import EventDialog from './EventDialog';
import { ORDER_DATES, validateOrderDates } from './orderDates';

const Section = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {title}
    </Typography>
    {children}
  </Paper>
);

const NewOrderPage = () => {
  const { user, hasFeature } = useAuth();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [eventDialog, setEventDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const stageOwners = hasFeature('stageOwners');
  const [form, setForm] = useState({
    eventId: Number(params.get('event')) || null, // Viene preelegido desde la pantalla de Eventos.
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
  const [extraEvents, setExtraEvents] = useState([]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const events = [...extraEvents, ...data.events];
  const selectedEvent = events.find((e) => e.id === form.eventId) || null;
  const dateErrors = validateOrderDates(form);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.eventId || Object.keys(dateErrors).length) return;
    setSaving(true);
    try {
      const payload = { ...form };
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
      <PageHeader title="Nueva orden de servicio" subtitle="Elegí el evento y quiénes participan. Los ítems se cargan en el paso siguiente." />
      <Stack spacing={2}>
        <Section title="Evento">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Autocomplete
              fullWidth
              options={events}
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
            <Button variant="outlined" startIcon={<Add />} onClick={() => setEventDialog(true)} sx={{ flexShrink: 0 }}>
              Nuevo evento
            </Button>
          </Stack>
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
          <Button type="submit" variant="contained" disabled={saving || !form.eventId || !!Object.keys(dateErrors).length}>
            {saving ? 'Creando…' : 'Crear y cargar ítems'}
          </Button>
        </Stack>
      </Stack>

      <EventDialog
        open={eventDialog}
        onClose={() => setEventDialog(false)}
        locations={data.locations}
        onSaved={(ev) => {
          setExtraEvents((list) => [ev, ...list]);
          setForm((f) => ({ ...f, eventId: ev.id }));
          setEventDialog(false);
        }}
      />
    </Box>
  );
};

export default NewOrderPage;
