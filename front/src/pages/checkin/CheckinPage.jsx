import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Autocomplete, Box, Button, Chip, Grid, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import { EmptyState, ErrorState, Loading, PageHeader, StatusChip } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';
import { eventLabel, formatDate, formatDateTime, userName } from '../../lib/format';
import { isActiveStatus } from '../../lib/status';

/** Pide la ubicación al navegador. Devuelve null si no hay permiso o no hay GPS. */
const getPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });

const distanceLabel = (m) => (m == null ? null : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

/** Una fila del historial. */
const CheckInRow = ({ c, showOrder }) => (
  <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
    <Chip
      size="small"
      icon={c.kind === 'in' ? <LoginOutlined /> : <LogoutOutlined />}
      label={c.kind === 'in' ? 'Check-in' : 'Check-out'}
      color={c.kind === 'in' ? 'primary' : 'default'}
    />
    <Box sx={{ flex: 1, minWidth: 200 }}>
      {showOrder && c.ServiceOrder && (
        <Typography variant="body2" sx={{ fontWeight: 700 }} component={RouterLink} to={`/service-orders/${c.ServiceOrder.id}`} color="inherit" style={{ textDecoration: 'none' }}>
          #{c.ServiceOrder.id} · {eventLabel(c.ServiceOrder.Event)}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" component="div">
        {formatDateTime(c.createdAt)} · {userName(c.User) || 'Usuario eliminado'}
        {c.note ? ` · “${c.note}”` : ''}
      </Typography>
    </Box>
    {c.lat != null ? (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Chip size="small" variant="outlined" color={c.onSite ? 'success' : 'warning'} label={c.onSite ? 'En el lugar' : c.distanceM != null ? `A ${distanceLabel(c.distanceM)}` : 'Lugar sin coordenadas'} />
        <Link href={mapsLink(c.lat, c.lng)} target="_blank" rel="noopener" variant="caption">
          Mapa
        </Link>
      </Stack>
    ) : (
      <Chip size="small" variant="outlined" label="Sin ubicación" />
    )}
  </Paper>
);

/** Check-in / check-out del material en el evento, con la ubicación del dispositivo. */
const CheckinPage = () => {
  const { notify, confirm } = useFeedback();
  const { can } = useAuth();
  const [order, setOrder] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);

  const orders = useLoader(() => api.get('/service-orders').then((r) => r.data.filter((o) => isActiveStatus(o.status))), []);
  const history = useLoader(() => api.get('/checkins').then((r) => r.data), []);
  const options = useMemo(() => orders.data || [], [orders.data]);

  const register = async (kind) => {
    setBusy(kind);
    try {
      const pos = await getPosition();
      const body = { kind, note: note.trim() || undefined, ...(pos || {}) };
      try {
        const { data } = await api.post(`/service-orders/${order.id}/checkins`, body);
        notify(data.message);
      } catch (err) {
        if (err.response?.status !== 409 || !err.response?.data?.errors?.confirm) throw err;
        const ok = await confirm({ title: 'Estás lejos del lugar', message: `${err.message} Queda registrado como "fuera del lugar".`, confirmLabel: 'Registrar igual' });
        if (!ok) return;
        const { data } = await api.post(`/service-orders/${order.id}/checkins`, { ...body, force: true });
        notify(data.message);
      }
      setNote('');
      history.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  const place = order?.Event?.Location;
  return (
    <>
      <PageHeader title="Check-in / out" subtitle="Registrá cuándo el material llega al evento y cuándo se retira, con la ubicación del celular." />
      {can('checkin', 'create') && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={options}
                loading={orders.loading}
                value={order}
                onChange={(_, v) => setOrder(v)}
                getOptionLabel={(o) => `#${o.id} · ${eventLabel(o.Event)} · ${formatDate(o.Event?.dateEvent)}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Orden en curso" />}
              />
              {order && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                  <StatusChip status={order.status} />
                  {place?.lat != null ? (
                    <Typography variant="caption" color="text.secondary">
                      <PlaceOutlined sx={{ fontSize: 14, verticalAlign: 'middle' }} /> {place.locationName}: con coordenadas.
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="warning.main">
                      {place?.locationName || 'El lugar'} no tiene coordenadas: el check-in se registra sin verificar la distancia.{' '}
                      <Link component={RouterLink} to="/locations">
                        Cargarlas
                      </Link>
                    </Typography>
                  )}
                </Stack>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Faltó un baúl, llegó el camión 2…" />
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button variant="contained" startIcon={<LoginOutlined />} disabled={!order || !!busy} onClick={() => register('in')}>
                  {busy === 'in' ? 'Ubicando…' : 'Check-in: llegó'}
                </Button>
                <Button variant="outlined" startIcon={<LogoutOutlined />} disabled={!order || !!busy} onClick={() => register('out')}>
                  {busy === 'out' ? 'Ubicando…' : 'Check-out: se retira'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
          <Alert severity="info" sx={{ mt: 2 }}>
            El navegador pide permiso para usar la ubicación. Si estás a más de {history.data?.radiusM ?? 300} m del lugar, te lo avisa y podés registrarlo igual.
          </Alert>
        </Paper>
      )}

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Últimos registros
      </Typography>
      {history.loading && !history.data ? (
        <Loading />
      ) : history.error ? (
        <ErrorState message={history.error} onRetry={history.reload} />
      ) : !history.data.checkIns.length ? (
        <Paper variant="outlined">
          <EmptyState title="Todavía no hay check-ins" description="El primero aparece acá apenas se registra." />
        </Paper>
      ) : (
        <Stack spacing={1}>
          {history.data.checkIns.map((c) => (
            <CheckInRow key={c.id} c={c} showOrder />
          ))}
        </Stack>
      )}
    </>
  );
};

export default CheckinPage;
