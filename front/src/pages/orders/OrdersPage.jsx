import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography, useMediaQuery } from '@mui/material';
import Add from '@mui/icons-material/Add';
import DataTable, { ColumnsButton } from '../../components/DataTable';
import { EmptyState, ErrorState, Loading, PageHeader, StatusChip } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useColumns } from '../../hooks/useColumns';
import { useLoader } from '../../hooks/useLoader';
import { api } from '../../lib/api';
import { eventLabel, formatDate, formatDateTime, userName } from '../../lib/format';
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
    <Typography
      variant="body2"
      sx={{
        fontWeight: person.id === me ? 800 : 400,
        color: person.id === me ? 'primary.main' : 'inherit',
      }}
    >
      {userName(person)}
    </Typography>
  ) : (
    <Typography variant="body2" color="text.disabled">
      Sin asignar
    </Typography>
  );

/** Columnas de la tabla de órdenes. Las `hidden` se agregan desde "Columnas". */
const columnsFor = (me) => [
  { id: 'id', label: 'N°', sx: { fontWeight: 800 }, render: (o) => `#${o.id}` },
  {
    id: 'event',
    label: 'Evento',
    sx: { maxWidth: 280 },
    render: (o) => (
      <>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
          {eventLabel(o.Event)}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {[o.Event?.organizer, o.Event?.finalClient].filter(Boolean).join(' · ')}
        </Typography>
      </>
    ),
  },
  {
    id: 'eventName',
    label: 'Nombre del evento',
    hidden: true,
    render: (o) => o.Event?.eventName || '—',
  },
  {
    id: 'location',
    label: 'Lugar',
    hidden: true,
    render: (o) => o.Event?.Location?.locationName || '—',
  },
  {
    id: 'city',
    label: 'Ciudad',
    hidden: true,
    render: (o) => o.Event?.Location?.city || '—',
  },
  {
    id: 'organizer',
    label: 'Organizador',
    hidden: true,
    render: (o) => o.Event?.organizer || '—',
  },
  {
    id: 'producer',
    label: 'Productora',
    hidden: true,
    render: (o) => o.Event?.producer || '—',
  },
  {
    id: 'finalClient',
    label: 'Cliente final',
    hidden: true,
    render: (o) => o.Event?.finalClient || '—',
  },
  { id: 'date', label: 'Fecha', render: (o) => formatDate(o.Event?.dateEvent) },
  {
    id: 'createdDate',
    label: 'Creada',
    hidden: true,
    render: (o) => formatDate(o.createdDate),
  },
  {
    id: 'outcomeDate',
    label: 'Salida',
    hidden: true,
    hint: 'del depósito',
    render: (o) => formatDateTime(o.outcomeDate),
  },
  {
    id: 'assemblyDate',
    label: 'Armado',
    hidden: true,
    hint: 'en el evento',
    render: (o) => formatDateTime(o.assemblyDate),
  },
  {
    id: 'disassemblyDate',
    label: 'Desarme',
    hidden: true,
    hint: 'en el evento',
    render: (o) => formatDateTime(o.disassemblyDate),
  },
  {
    id: 'incomeDate',
    label: 'Vuelta',
    hidden: true,
    hint: 'al depósito',
    render: (o) => formatDateTime(o.incomeDate),
  },
  {
    id: 'status',
    label: 'Estado',
    render: (o) => <StatusChip status={o.status} />,
  },
  { id: 'items', label: 'Ítems', align: 'right', render: (o) => o.itemCount },
  {
    id: 'orderedBy',
    label: 'Creada por',
    render: (o) => <Person person={o.OrderedBy} me={me} />,
  },
  {
    id: 'checkedBy',
    label: 'Chequea',
    render: (o) => <Person person={o.CheckedBy} me={me} />,
  },
  {
    id: 'deployedBy',
    label: 'Arma',
    render: (o) => <Person person={o.DeployedBy} me={me} />,
  },
  {
    id: 'logisticsBy',
    label: 'Logística',
    hidden: true,
    render: (o) => <Person person={o.LogisticsBy} me={me} />,
  },
  {
    id: 'receptionBy',
    label: 'Recepción',
    hidden: true,
    render: (o) => <Person person={o.ReceptionBy} me={me} />,
  },
  {
    id: 'observations',
    label: 'Observaciones',
    hidden: true,
    sx: { maxWidth: 320 },
    render: (o) => o.observations || '—',
  },
];

const OrdersPage = () => {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') || 'active';
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const isPhone = useMediaQuery((t) => t.breakpoints.down('sm'));
  const columns = useColumns(
    'orders',
    useMemo(() => columnsFor(user.id), [user.id]),
  );

  const { data: orders, loading, error, reload } = useLoader(() => api.get('/service-orders').then((r) => r.data));

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders || []).filter(
      (o) =>
        matchesFilter(o, filter, user) &&
        (!status || o.status === status) &&
        (!q ||
          String(o.id) === q ||
          [o.Event?.eventName, o.Event?.Location?.locationName, o.Event?.organizer, o.Event?.finalClient].filter(Boolean).some((v) => v.toLowerCase().includes(q))),
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
        <TextField label="Buscar evento, lugar, cliente o N°" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 2 }} />
        <TextField select label="Mostrar" value={filter} onChange={(e) => setParams(e.target.value === 'active' ? {} : { filter: e.target.value })} sx={{ flex: 1, minWidth: 180 }}>
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
        {!isPhone && <ColumnsButton columns={columns} />}
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
                sx={{
                  p: 1.75,
                  cursor: 'pointer',
                  borderColor: mine ? 'primary.main' : 'divider',
                  borderWidth: mine ? 2 : 1,
                }}
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
        <Paper variant="outlined">
          <DataTable
            columns={columns}
            rows={visible}
            minWidth={820}
            rowProps={(o) => ({
              onClick: () => navigate(`/service-orders/${o.id}`),
              sx: { cursor: 'pointer' },
            })}
          />
          {!visible.length && <EmptyState title="No hay órdenes para mostrar" description="Probá con otro filtro o creá una orden nueva." />}
        </Paper>
      )}
    </>
  );
};

export default OrdersPage;
