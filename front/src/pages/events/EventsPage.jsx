import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader, StatusChip } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { useUrlParams } from '../../hooks/useUrlParams';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import EventDialog from '../orders/EventDialog';

const isPast = (e) => new Date(e.dateEvent) < new Date(new Date().toDateString());

/** Duplica un evento: misma info en otra fecha y, si se pide, el mismo material (tomado del stock libre). */
const DuplicateDialog = ({ event, onClose, onDone }) => {
  const { notify } = useFeedback();
  const [form, setForm] = useState({ eventName: `${event.eventName} (copia)`, dateEvent: '', copyMaterial: event.ServiceOrders?.length > 0 });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/events/${event.id}/duplicate`, { ...form, dateEvent: new Date(form.dateEvent).toISOString() });
      notify(data.message);
      if (data.missing?.length) setResult(data);
      else onDone(data);
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <FormDialog open onClose={() => onDone(result)} title="Evento duplicado" onSubmit={() => onDone(result)} submitLabel="Ver la orden nueva">
        <Alert severity="warning">No había stock libre suficiente en algunas categorías. La orden se creó con lo disponible:</Alert>
        {result.missing.map((m) => (
          <Typography key={m.category} variant="body2">
            <b>{m.category}</b>: se cargaron {m.added} de {m.wanted}
          </Typography>
        ))}
      </FormDialog>
    );
  }

  return (
    <FormDialog open onClose={onClose} title={`Duplicar ${event.eventName}`} onSubmit={save} saving={saving} disabled={!form.dateEvent || !form.eventName.trim()} submitLabel="Duplicar">
      <TextField label="Nombre del evento nuevo" value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} />
      <TextField
        label="Fecha y hora"
        type="datetime-local"
        value={form.dateEvent}
        onChange={(e) => setForm({ ...form, dateEvent: e.target.value })}
        InputLabelProps={{ shrink: true }}
        required
        autoFocus
      />
      <FormControlLabel
        control={<Switch checked={form.copyMaterial} onChange={(e) => setForm({ ...form, copyMaterial: e.target.checked })} disabled={!event.ServiceOrders?.length} />}
        label="Copiar el material (misma cantidad por categoría, con ítems libres)"
      />
      <Typography variant="body2" color="text.secondary">
        Se copian lugar, organizador, productor y cliente. La orden nueva arranca en “Creada” con los mismos responsables.
      </Typography>
    </FormDialog>
  );
};

const EventsPage = () => {
  const navigate = useNavigate();
  const { can, hasFeature } = useAuth();
  const [search, setSearch] = useState('');
  const [when, setWhen] = useState('upcoming');
  const [editing, setEditing] = useState(null); // evento o {} para crear
  const [duplicating, setDuplicating] = useState(null);
  useUrlParams(({ accion, buscar }) => {
    if (accion === 'nuevo' && can('events', 'create')) setEditing({});
    if (buscar) {
      setSearch(buscar);
      setWhen('all');
    }
  });

  const { data, loading, error, reload } = useLoader(async () => {
    const [events, locations] = await Promise.all([api.get('/events').then((r) => r.data), api.get('/locations').then((r) => r.data)]);
    return { events, locations };
  }, []);

  const canEdit = can('events', 'update');
  const canCreate = can('events', 'create');
  const canDuplicate = hasFeature('eventTools');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (data?.events || []).filter(
      (e) =>
        (when === 'all' || (when === 'past' ? isPast(e) : !isPast(e))) &&
        (!q || [e.eventName, e.organizer, e.producer, e.finalClient, e.Location?.locationName].filter(Boolean).some((v) => v.toLowerCase().includes(q))),
    );
    // Próximos: el más cercano primero.
    return when === 'upcoming' ? [...list].sort((a, b) => new Date(a.dateEvent) - new Date(b.dateEvent)) : list;
  }, [data, search, when]);

  return (
    <>
      <PageHeader
        title="Eventos"
        subtitle="Cada evento con su lugar, cliente y órdenes de material."
        actions={
          canCreate && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({})}>
              Nuevo evento
            </Button>
          )
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField label="Buscar evento, cliente o lugar" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 2 }} />
        <TextField select label="Mostrar" value={when} onChange={(e) => setWhen(e.target.value)} sx={{ flex: 1, minWidth: 160 }}>
          <MenuItem value="upcoming">Próximos</MenuItem>
          <MenuItem value="past">Pasados</MenuItem>
          <MenuItem value="all">Todos</MenuItem>
        </TextField>
      </Stack>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !visible.length ? (
        <Paper variant="outlined">
          <EmptyState title="No hay eventos para mostrar" description={when === 'upcoming' ? 'Probá con “Pasados” o creá uno nuevo.' : undefined} />
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {visible.map((e) => (
            <Grid item xs={12} md={6} key={e.id}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800 }} noWrap>
                      {e.eventName}
                    </Typography>
                    <Typography variant="body2" color={isPast(e) ? 'text.disabled' : 'secondary.main'} sx={{ fontWeight: 700 }}>
                      {formatDateTime(e.dateEvent)}
                    </Typography>
                  </Box>
                  {isPast(e) && <Chip size="small" label="Pasado" variant="outlined" />}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PlaceOutlined sx={{ fontSize: 16 }} /> {e.Location?.locationName} · {e.Location?.city}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {[e.organizer, e.finalClient].filter(Boolean).join(' · ')}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {(e.ServiceOrders || []).map((o) => (
                    <Chip
                      key={o.id}
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/service-orders/${o.id}`)}
                      label={
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                          #{o.id} <StatusChip status={o.status} size="small" />
                        </Box>
                      }
                      sx={{ '& .MuiChip-label': { px: 0.75 }, '& .MuiChip-root': { height: 18 } }}
                    />
                  ))}
                  {!e.ServiceOrders?.length && (
                    <Typography variant="caption" color="text.disabled">
                      Sin orden de material
                    </Typography>
                  )}
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 1 }} flexWrap="wrap" useFlexGap>
                  {canEdit && (
                    <Button size="small" startIcon={<EditOutlined />} onClick={() => setEditing(e)}>
                      Editar
                    </Button>
                  )}
                  {canCreate &&
                    (canDuplicate ? (
                      <Button size="small" startIcon={<ContentCopyOutlined />} onClick={() => setDuplicating(e)}>
                        Duplicar
                      </Button>
                    ) : (
                      <Tooltip title="Duplicar eventos es parte del plan Profesional">
                        <span>
                          <Button size="small" startIcon={<LockOutlined />} disabled>
                            Duplicar
                          </Button>
                        </span>
                      </Tooltip>
                    ))}
                  {canCreate && !e.ServiceOrders?.length && (
                    <Button size="small" component={RouterLink} to={`/service-orders/new?event=${e.id}`}>
                      Crear orden
                    </Button>
                  )}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <EventDialog
        open={!!editing}
        event={editing?.id ? editing : null}
        locations={data?.locations || []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
      {duplicating && (
        <DuplicateDialog
          event={duplicating}
          onClose={() => setDuplicating(null)}
          onDone={(res) => {
            setDuplicating(null);
            if (res.orderId) navigate(`/service-orders/${res.orderId}`);
            else reload();
          }}
        />
      )}
    </>
  );
};

export default EventsPage;
