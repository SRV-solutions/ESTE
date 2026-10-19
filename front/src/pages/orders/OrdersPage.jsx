import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import { EmptyState, ErrorState, Loading, PageHeader, StatusChip } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLoader } from '../../hooks/useLoader';
import { api } from '../../lib/api';
import { eventLabel, formatDate, userName } from '../../lib/format';
import { responsibleOf } from '../../lib/stages';
import { STATUS, STATUS_ORDER, isActiveStatus } from '../../lib/status';

const FILTERS = [
  { value: 'active', label: 'En curso' },
  { value: 'myTurn', label: 'Me toca a mí' },
  { value: 'all', label: 'Todas' },
  { value: 'mine', label: 'Creadas por mí' },
  { value: 'toReview', label: 'Para revisar' },
  { value: 'toBuild', label: 'Para armar' },
  { value: 'involved', label: 'Donde participo' },
];

const matchesFilter = (order, filter, user) => {
  switch (filter) {
    case 'active':
      return isActiveStatus(order.status);
    case 'myTurn':
      return responsibleOf(order) === user.id;
    case 'mine':
      return order.orderedBy === user.id;
    case 'toReview':
      return order.status === 'in_review' && (order.checkedBy === user.id || user.isAdmin);
    case 'toBuild':
      return ['approved', 'in_process'].includes(order.status) && (order.deployedBy === user.id || user.isAdmin);
    case 'involved':
      return [order.orderedBy, order.checkedBy, order.deployedBy, order.logisticsBy, order.receptionBy].includes(user.id);
    default:
      return true;
  }
};

const Person = ({ person, me }) =>
  person ? (
    <Typography variant="body2" sx={{ fontWeight: person.id === me ? 800 : 400, color: person.id === me ? 'primary.main' : 'inherit' }}>
      {userName(person)}
    </Typography>
  ) : (
    <Typography variant="body2" color="text.disabled">
      Sin asignar
    </Typography>
  );

const OrdersPage = () => {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || 'active';
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const isPhone = useMediaQuery((t) => t.breakpoints.down('sm'));

  const { data: orders, loading, error, reload } = useLoader(() => api.get('/service-orders').then((r) => r.data));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders || []).filter(
      (o) =>
        matchesFilter(o, filter, user) &&
        (!status || o.status === status) &&
        (!q ||
          String(o.id) === q ||
          [o.Event?.eventName, o.Event?.Location?.locationName, o.Event?.organizer, o.Event?.finalClient]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q))),
    );
  }, [orders, filter, status, search, user]);

  return (
    <>
      <PageHeader
        title="Órdenes de servicio"
        subtitle="Todo el material que sale del depósito para cada evento."
        actions={
          can('serviceOrders', 'create') && (
            <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/service-orders/new')}>
              Nueva orden
            </Button>
          )
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          label="Buscar evento, lugar, cliente o N°"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 2 }}
        />
        <TextField
          select
          label="Mostrar"
          value={filter}
          onChange={(e) => setParams(e.target.value === 'active' ? {} : { filter: e.target.value })}
          sx={{ flex: 1, minWidth: 180 }}
        >
          {FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField select label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ flex: 1, minWidth: 180 }}>
          <MenuItem value="">Todos</MenuItem>
          {STATUS_ORDER.map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS[s].label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading && !orders ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : isPhone ? (
        // En el celular: tarjetas en vez de tabla.
        <Stack spacing={1}>
          {visible.map((o) => {
            const mine = responsibleOf(o) === user.id && isActiveStatus(o.status);
            return (
              <Paper
                key={o.id}
                variant="outlined"
                onClick={() => navigate(`/service-orders/${o.id}`)}
                sx={{ p: 1.75, cursor: 'pointer', borderColor: mine ? 'primary.main' : 'divider', borderWidth: mine ? 2 : 1 }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                      #{o.id} · {eventLabel(o.Event)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {formatDate(o.Event?.dateEvent)} · {o.itemCount} ítems
                    </Typography>
                  </Box>
                  <StatusChip status={o.status} />
                </Stack>
                {mine && (
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 800 }}>
                    Te toca avanzarla
                  </Typography>
                )}
              </Paper>
            );
          })}
          {!visible.length && <EmptyState title="No hay órdenes para mostrar" description="Probá con otro filtro o creá una orden nueva." />}
        </Stack>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell>N°</TableCell>
                <TableCell>Evento</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Ítems</TableCell>
                <TableCell>Creada por</TableCell>
                <TableCell>Chequea</TableCell>
                <TableCell>Arma</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((o) => (
                <TableRow key={o.id} hover onClick={() => navigate(`/service-orders/${o.id}`)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ fontWeight: 800 }}>#{o.id}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {eventLabel(o.Event)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {[o.Event?.organizer, o.Event?.finalClient].filter(Boolean).join(' · ')}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(o.Event?.dateEvent)}</TableCell>
                  <TableCell>
                    <StatusChip status={o.status} />
                  </TableCell>
                  <TableCell align="right">{o.itemCount}</TableCell>
                  <TableCell>
                    <Person person={o.OrderedBy} me={user.id} />
                  </TableCell>
                  <TableCell>
                    <Person person={o.CheckedBy} me={user.id} />
                  </TableCell>
                  <TableCell>
                    <Person person={o.DeployedBy} me={user.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!visible.length && (
            <EmptyState title="No hay órdenes para mostrar" description="Probá con otro filtro o creá una orden nueva." />
          )}
        </TableContainer>
      )}
    </>
  );
};

export default OrdersPage;
