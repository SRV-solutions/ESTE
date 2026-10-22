import { useCallback, useMemo, useState } from 'react';
import { Button, Chip, IconButton, MenuItem, Paper, Stack, Switch, TablePagination, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DataTable, { ColumnsButton } from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader, YesNo } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useColumns } from '../../hooks/useColumns';
import { useLoader } from '../../hooks/useLoader';
import { useUrlParams } from '../../hooks/useUrlParams';
import { api, errorMessage } from '../../lib/api';
import { formatArs } from '../../lib/money';
import CategoryFields from './CategoryFields';
import { EMPTY_CATEGORY, isCategoryComplete } from './categoryForm';

const PAGE_SIZE = 25;

/** Columnas de la tabla. Las `hidden` se agregan desde "Columnas". */
const columnsFor = ({ toggle, canToggle }) => [
  {
    id: 'code',
    label: 'Código',
    sx: { fontFamily: 'ui-monospace, monospace', fontWeight: 800 },
    render: (c) => c.code,
  },
  {
    id: 'name',
    label: 'Nombre',
    sx: { maxWidth: 300 },
    render: (c) => (
      <>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {c.name}
        </Typography>
        {c.description && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {c.description}
          </Typography>
        )}
      </>
    ),
  },
  {
    id: 'description',
    label: 'Descripción',
    hidden: true,
    sx: { maxWidth: 320 },
    render: (c) => c.description || '—',
  },
  {
    id: 'type',
    label: 'Tipo',
    render: (c) => <Chip size="small" label={c.type} variant="outlined" />,
  },
  { id: 'unity', label: 'Unidad', hidden: true, render: (c) => c.unity },
  {
    id: 'value',
    label: 'Valor',
    hidden: true,
    align: 'right',
    hint: 'por unidad',
    render: (c) => formatArs(c.value),
  },
  {
    id: 'weight',
    label: 'Peso',
    hidden: true,
    align: 'right',
    hint: 'kg',
    render: (c) => c.weight,
  },
  {
    id: 'items',
    label: 'Ítems',
    align: 'right',
    render: (c) => (
      <>
        {c.activeItemCount}
        {c.itemCount !== c.activeItemCount && (
          <Typography component="span" variant="caption" color="text.disabled">
            {' '}
            / {c.itemCount}
          </Typography>
        )}
      </>
    ),
  },
  {
    id: 'totalValue',
    label: 'Valor del stock',
    hidden: true,
    align: 'right',
    hint: 'valor × ítems activos',
    render: (c) => formatArs(c.value * c.activeItemCount),
  },
  {
    id: 'storable',
    label: 'Almacenable',
    render: (c) => <YesNo value={c.isStorable} />,
  },
  {
    id: 'container',
    label: 'Contenedor',
    render: (c) => <YesNo value={c.isContainer} />,
  },
  {
    id: 'active',
    label: 'Activa',
    render: (c) => <Switch size="small" checked={c.isActive} disabled={!canToggle} onChange={() => toggle(c)} />,
  },
];

const CategoriesPage = () => {
  const { can } = useAuth();
  const { notify, confirm } = useFeedback();
  const [search, setSearch] = useState('');
  const [show, setShow] = useState('active');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null); // categoría o EMPTY_CATEGORY para crear
  useUrlParams(({ accion, buscar }) => {
    if (accion === 'nueva' && can('categories', 'create')) setEditing(EMPTY_CATEGORY);
    if (buscar) {
      setSearch(buscar);
      setPage(0);
    }
  });
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useLoader(() => api.get('/categories').then((r) => r.data), []);

  const types = useMemo(() => [...new Set((data || []).map((c) => c.type).filter(Boolean))].sort(), [data]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || []).filter(
      (c) => (show === 'all' || (show === 'active' ? c.isActive : !c.isActive)) && (!q || `${c.code} ${c.name} ${c.type} ${c.description ?? ''}`.toLowerCase().includes(q)),
    );
  }, [data, search, show]);

  const save = async () => {
    setSaving(true);
    try {
      if (editing.id) await api.patch(`/categories/${editing.id}`, editing);
      else await api.post('/categories', editing);
      notify(editing.id ? 'Categoría actualizada.' : 'Categoría creada.');
      setEditing(null);
      reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = useCallback(
    async (category) => {
      if (category.isActive) {
        const ok = await confirm({
          title: `Desactivar ${category.name}`,
          message: `También se desactivan sus ${category.itemCount} ítem(s): dejan de poder cargarse en órdenes. No se borra nada y se puede volver a activar.`,
          confirmLabel: 'Desactivar',
          danger: true,
        });
        if (!ok) return;
      }
      try {
        const { data: res } = await api.patch(`/categories/${category.id}/toggle`);
        notify(res.message);
        reload();
      } catch (err) {
        notify(errorMessage(err), 'error');
      }
    },
    [confirm, notify, reload],
  );

  const rows = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const isPhone = useMediaQuery((t) => t.breakpoints.down('sm'));
  const canToggle = can('categories', 'delete');
  const columns = useColumns(
    'categories',
    useMemo(() => columnsFor({ toggle, canToggle }), [toggle, canToggle]),
  );

  return (
    <>
      <PageHeader
        title="Categorías"
        subtitle="Los tipos de material: cada categoría agrupa ítems con el mismo código base."
        actions={
          can('categories', 'create') && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(EMPTY_CATEGORY)}>
              Nueva categoría
            </Button>
          )
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          label="Buscar por código, nombre o tipo"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ flex: 2 }}
        />
        <TextField
          select
          label="Mostrar"
          value={show}
          onChange={(e) => {
            setShow(e.target.value);
            setPage(0);
          }}
          sx={{ flex: 1, minWidth: 160 }}
        >
          <MenuItem value="active">Activas</MenuItem>
          <MenuItem value="inactive">Desactivadas</MenuItem>
          <MenuItem value="all">Todas</MenuItem>
        </TextField>
        {!isPhone && <ColumnsButton columns={columns} />}
      </Stack>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Paper variant="outlined">
          <DataTable
            columns={columns}
            rows={rows}
            minWidth={820}
            rowProps={(c) => ({ sx: { opacity: c.isActive ? 1 : 0.55 } })}
            actions={
              can('categories', 'update')
                ? (c) => (
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => setEditing({ ...c, description: c.description ?? '' })}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )
                : undefined
            }
          />
          {!visible.length && <EmptyState title="No hay categorías para mostrar" />}
          <TablePagination
            component="div"
            count={visible.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            sx={{ borderTop: 1, borderColor: 'divider' }}
          />
        </Paper>
      )}

      <FormDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Editar ${editing.name}` : 'Nueva categoría'}
        onSubmit={save}
        saving={saving}
        disabled={!editing || !isCategoryComplete(editing)}
        maxWidth="md"
      >
        {editing && <CategoryFields value={editing} onChange={setEditing} types={types} />}
        {editing?.id && (
          <Typography variant="body2" color="text.secondary">
            Cambiar el código no renombra los ítems que ya existen; solo afecta a los nuevos.
          </Typography>
        )}
      </FormDialog>
    </>
  );
};

export default CategoriesPage;
