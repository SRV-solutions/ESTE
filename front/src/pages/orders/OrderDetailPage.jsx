import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import MoveUpOutlined from '@mui/icons-material/MoveUpOutlined';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import DeleteSweepOutlined from '@mui/icons-material/DeleteSweepOutlined';
import { ErrorState, Loading, PageHeader, StatusChip } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';
import { eventLabel, plural } from '../../lib/format';
import { CONFIRM_STATUSES, STATUS } from '../../lib/status';
import AddFromStock from './AddFromStock';
import OrderEditDialog from './OrderEditDialog';
import OrderInfo from './OrderInfo';
import OrderItems from './OrderItems';
import SwapItemDialog from './SwapItemDialog';
import TransferDialog from './TransferDialog';

const OrderDetailPage = () => {
  const { id } = useParams();
  const { can, company, user, isAdmin, hasFeature } = useAuth();
  const navigate = useNavigate();
  const { notify, confirm } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [swapping, setSwapping] = useState(null);
  const [statusMenu, setStatusMenu] = useState(null);
  const [stock, setStock] = useState({ all: null, storable: null, loading: false });
  const [users, setUsers] = useState([]);

  const { data: order, loading, error, reload } = useLoader(() => api.get(`/service-orders/${id}`).then((r) => r.data), [id]);
  const canEdit = !!order?.access?.canEdit;
  // Los responsables se reasignan durante todo el recorrido (admin o quien creó la orden).
  const canReassign = !!order && !canEdit && order.status !== 'disassembled' && (isAdmin || order.orderedBy === user.id);

  // El stock libre solo hace falta si se puede editar la orden.
  const loadStock = useCallback(async () => {
    setStock((s) => ({ ...s, loading: true }));
    try {
      const [all, storable] = await Promise.all([
        api.get('/items/available/summary').then((r) => r.data),
        api.get('/items/available/summary', { params: { storable: true } }).then((r) => r.data),
      ]);
      setStock({ all, storable, loading: false });
    } catch (err) {
      setStock((s) => ({ ...s, loading: false }));
      notify(errorMessage(err), 'error');
    }
  }, [notify]);

  useEffect(() => {
    if (canEdit) loadStock();
  }, [canEdit, loadStock]);

  useEffect(() => {
    if ((canEdit || canReassign) && can('users', 'read')) api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  }, [canEdit, canReassign, can]);

  const refreshAll = () => {
    reload();
    if (canEdit) loadStock();
  };

  /** Ejecuta una acción sobre la orden, avisa el resultado y recarga. */
  const run = async (request, successMessage) => {
    try {
      const { data } = await request();
      notify(successMessage || data?.message || 'Listo.');
      refreshAll();
      return true;
    } catch (err) {
      notify(errorMessage(err), 'error');
      return false;
    }
  };

  if (loading && !order) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const changeStatus = async (status) => {
    setStatusMenu(null);
    if (CONFIRM_STATUSES.has(status)) {
      const ok = await confirm({
        title: `${STATUS[status].action}`,
        message:
          status === 'disassembled'
            ? 'Todos los ítems de la orden vuelven a quedar libres en el depósito.'
            : `La orden #${order.id} pasa a "${STATUS[status].label}".`,
        confirmLabel: STATUS[status].action,
        danger: status === 'rejected',
      });
      if (!ok) return;
    }
    await run(() => api.patch(`/service-orders/${order.id}/status`, { status }), `Orden en "${STATUS[status].label}".`);
  };

  const removeItem = async (item) => {
    const ok = await confirm({
      title: `Quitar ${item.code}`,
      message: item.contents?.some((c) => c.source === 'order') ? 'Lo que cargaste dentro de este contenedor también sale de la orden.' : undefined,
      confirmLabel: 'Quitar',
      danger: true,
    });
    if (ok) await run(() => api.delete(`/service-orders/${order.id}/items/${item.id}`));
  };

  const removeAll = async () => {
    const ok = await confirm({
      title: 'Vaciar la orden',
      message: `Se quitan los ${order.items.length} ítems y todo lo cargado en sus contenedores. No se puede deshacer.`,
      confirmLabel: 'Vaciar',
      danger: true,
    });
    if (ok) await run(() => api.delete(`/service-orders/${order.id}/items`));
  };

  const next = order.access.nextStatuses;
  const contentsCount = order.items.reduce((n, i) => n + (i.contents?.length || 0), 0);

  return (
    <>
      <PageHeader
        overline={`Orden de servicio #${order.id}`}
        title={eventLabel(order.Event)}
        subtitle={
          <Stack direction="row" spacing={1} alignItems="center" component="span" sx={{ mt: 0.5 }}>
            <StatusChip status={order.status} />
            <span>
              {plural(order.items.length, 'ítem', 'ítems')}
              {contentsCount ? ` + ${contentsCount} en contenedores` : ''}
            </span>
          </Stack>
        }
        actions={
          <>
            <Button variant="outlined" startIcon={<PictureAsPdfOutlined />} onClick={() => import('../../lib/pdf').then((m) => m.downloadOrderPdf(order, company)).catch((err) => notify(errorMessage(err, 'No se pudo generar el PDF.'), 'error'))}>
              PDF
            </Button>
            {canEdit && (
              <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
            {canReassign && (
              <Button variant="outlined" startIcon={<GroupOutlined />} onClick={() => setReassigning(true)}>
                Responsables
              </Button>
            )}
            {order.access.canTransfer && hasFeature('eventTools') && (
              <Button variant="outlined" startIcon={<MoveUpOutlined />} onClick={() => setTransferring(true)}>
                Pasar a otro evento
              </Button>
            )}
            {next.length === 1 && (
              <Button variant="contained" endIcon={<ArrowForward />} onClick={() => changeStatus(next[0])}>
                {STATUS[next[0]].action}
              </Button>
            )}
            {next.length > 1 && (
              <>
                <Button variant="contained" endIcon={<ArrowForward />} onClick={(e) => setStatusMenu(e.currentTarget)}>
                  Cambiar estado
                </Button>
                <Menu anchorEl={statusMenu} open={!!statusMenu} onClose={() => setStatusMenu(null)}>
                  {next.map((s) => (
                    <MenuItem key={s} onClick={() => changeStatus(s)}>
                      {STATUS[s].action}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </>
        }
      />

      {order.access.stage && order.access.stage.responsibleId === user.id && next.length > 0 && (
        <Alert severity="warning" icon={<NotificationsActiveOutlined />} sx={{ mb: 2, fontWeight: 600 }}>
          Te toca: {order.access.stage.label}. Cuando termines, tocá «{STATUS[next[0]].action}».
        </Alert>
      )}
      {order.TransferredTo && (
        <Alert severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" component={RouterLink} to={`/service-orders/${order.TransferredTo.id}`}>Ver</Button>}>
          El material de esta orden pasó directo a la orden #{order.TransferredTo.id}.
        </Alert>
      )}
      {order.transferredFrom?.map((o) => (
        <Alert key={o.id} severity="info" sx={{ mb: 2 }} action={<Button color="inherit" size="small" component={RouterLink} to={`/service-orders/${o.id}`}>Ver</Button>}>
          Recibió material directo de la orden #{o.id}{o.Event ? ` (${o.Event.eventName})` : ''}.
        </Alert>
      ))}
      {!canEdit && order.status === 'created' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Solo quien creó la orden puede cargar ítems mientras está en «Creada».
        </Alert>
      )}

      <OrderInfo order={order} showStageOwners={hasFeature('stageOwners')} />

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="h5">Material</Typography>
        {canEdit && order.items.length > 0 && (
          <Button color="error" size="small" startIcon={<DeleteSweepOutlined />} onClick={removeAll}>
            Vaciar orden
          </Button>
        )}
      </Stack>

      {canEdit && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <AddFromStock
            summary={stock.all}
            loading={stock.loading}
            onAdd={(categoryId, quantity) =>
              run(() => api.post(`/service-orders/${order.id}/items`, { categoryId, quantity }))
            }
          />
        </Paper>
      )}

      <OrderItems
        items={order.items}
        canEdit={canEdit}
        storableSummary={stock.storable}
        onSwap={setSwapping}
        onRemove={removeItem}
        onRemoveContent={(container, child) =>
          run(() => api.delete(`/service-orders/${order.id}/containers/${container.id}/items/${child.id}`))
        }
        onEmpty={async (container) => {
          const ok = await confirm({
            title: `Vaciar ${container.code}`,
            message: 'Se sacan de la orden todos los ítems cargados en este contenedor. El contenido fijo no se toca.',
            confirmLabel: 'Vaciar',
            danger: true,
          });
          if (ok) run(() => api.delete(`/service-orders/${order.id}/containers/${container.id}/items`));
        }}
        onFill={(container, categoryId, quantity) =>
          run(() => api.post(`/service-orders/${order.id}/containers/${container.id}/items`, { categoryId, quantity }))
        }
      />

      {canReassign && (
        <OrderEditDialog
          responsiblesOnly
          stageOwners={hasFeature('stageOwners')}
          open={reassigning}
          onClose={() => setReassigning(false)}
          order={order}
          users={users}
          onSaved={() => {
            setReassigning(false);
            reload();
          }}
        />
      )}
      {order.access.canTransfer && (
        <TransferDialog
          order={order}
          open={transferring}
          onClose={() => setTransferring(false)}
          onDone={(targetId) => {
            setTransferring(false);
            navigate(`/service-orders/${targetId}`);
          }}
        />
      )}
      {canEdit && (
        <>
          <OrderEditDialog
            stageOwners={hasFeature('stageOwners')}
            open={editing}
            onClose={() => setEditing(false)}
            order={order}
            users={users}
            onSaved={() => {
              setEditing(false);
              reload();
            }}
          />
          <SwapItemDialog
            orderId={order.id}
            item={swapping}
            onClose={() => setSwapping(null)}
            onSwapped={() => {
              setSwapping(null);
              refreshAll();
            }}
          />
        </>
      )}
    </>
  );
};

export default OrderDetailPage;
