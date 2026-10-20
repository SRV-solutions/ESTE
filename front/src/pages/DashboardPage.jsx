import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import { EmptyState, ErrorState, Loading, PageHeader, StatTile, StatusChip } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useLoader } from '../hooks/useLoader';
import { api } from '../lib/api';
import { eventLabel, formatDate, userName } from '../lib/format';
import { myTurn } from '../lib/stages';
import { isActiveStatus } from '../lib/status';
import { BRAND } from '../theme';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

const DashboardPage = () => {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const canOrders = can('serviceOrders', 'read');
  const canCategories = can('categories', 'read');

  const { data, loading, error, reload } = useLoader(async () => {
    const [orders, categories] = await Promise.all([
      canOrders ? api.get('/service-orders').then((r) => r.data) : [],
      canCategories ? api.get('/categories').then((r) => r.data) : [],
    ]);
    return { orders, categories };
  }, [canOrders, canCategories]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { orders, categories } = data;
  const active = orders.filter((o) => isActiveStatus(o.status));
  const toReview = active.filter((o) => o.status === 'in_review' && (o.checkedBy === user.id || user.isAdmin));
  const turn = myTurn(active, user.id);
  const mine = active.filter((o) => o.orderedBy === user.id);
  const totalItems = categories.reduce((sum, c) => sum + (c.activeItemCount || 0), 0);

  // Primero lo que le toca a la persona, después el resto por fecha de evento.
  const upcoming = [...turn, ...active.filter((o) => !turn.includes(o))]
    .filter((o) => o.Event?.dateEvent)
    .sort((a, b) => (turn.includes(b) - turn.includes(a)) || new Date(a.Event.dateEvent) - new Date(b.Event.dateEvent))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        overline={greeting()}
        title={userName(user)}
        subtitle={user.roleName}
        actions={
          can('serviceOrders', 'create') && (
            <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/service-orders/new')}>
              Nueva orden
            </Button>
          )
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {canOrders && (
          <>
            <Grid item xs={6} md={3}>
              <StatTile label="Órdenes activas" value={active.length} hint="Sin desarmar" onClick={() => navigate('/service-orders')} />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatTile
                label="Para revisar"
                value={toReview.length}
                hint={user.isAdmin ? 'En revisión' : 'Asignadas a vos'}
                accent={toReview.length ? BRAND.orange : undefined}
                onClick={() => navigate('/service-orders?filter=toReview')}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatTile
                label="Te toca"
                value={turn.length}
                hint="Órdenes en tu etapa"
                accent={turn.length ? BRAND.blue : undefined}
                onClick={() => navigate('/service-orders?filter=myTurn')}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatTile label="Mis órdenes" value={mine.length} hint="Creadas por vos, en curso" onClick={() => navigate('/service-orders?filter=mine')} />
            </Grid>
          </>
        )}
        {canCategories && (
          <>
            <Grid item xs={6} md={3}>
              <StatTile label="Ítems en stock" value={totalItems.toLocaleString('es-AR')} hint="Activos" onClick={() => navigate('/items')} />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatTile label="Categorías" value={categories.filter((c) => c.isActive).length} hint="Activas" onClick={() => navigate('/categories')} />
            </Grid>
          </>
        )}
      </Grid>

      {canOrders && (
        <Paper variant="outlined">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, pt: 2, pb: 1 }}>
            <Typography variant="h6">Órdenes en curso</Typography>
            <Button size="small" onClick={() => navigate('/service-orders')}>
              Ver todas
            </Button>
          </Stack>
          {upcoming.length ? (
            <List disablePadding>
              {upcoming.map((o) => (
                <ListItemButton key={o.id} onClick={() => navigate(`/service-orders/${o.id}`)} sx={{ px: 2.5, borderRadius: 0 }} divider>
                  <Box sx={{ width: { xs: 48, sm: 64 }, flexShrink: 0, color: 'text.secondary', fontWeight: 800, fontSize: 13 }}>#{o.id}</Box>
                  <ListItemText
                    primary={eventLabel(o.Event)}
                    secondary={`${turn.includes(o) ? 'Te toca · ' : ''}${formatDate(o.Event.dateEvent)} · ${o.itemCount} ítem(s)`}
                    primaryTypographyProps={{ fontWeight: 700, noWrap: true }}
                    sx={{ minWidth: 0, mr: 2 }}
                  />
                  <StatusChip status={o.status} />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <EmptyState title="No hay órdenes en curso" description="Cuando crees una orden de servicio va a aparecer acá." />
          )}
        </Paper>
      )}
    </>
  );
};

export default DashboardPage;
