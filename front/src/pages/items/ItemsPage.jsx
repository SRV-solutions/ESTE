import { useMemo, useState } from 'react';
import { Autocomplete, Box, Button, Chip, IconButton, ListItemIcon, Menu, MenuItem, Paper, Stack, TablePagination, TextField, Typography, useMediaQuery } from '@mui/material';
import Add from '@mui/icons-material/Add';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import MoreVert from '@mui/icons-material/MoreVert';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import ToggleOffOutlined from '@mui/icons-material/ToggleOffOutlined';
import ToggleOnOutlined from '@mui/icons-material/ToggleOnOutlined';
import DataTable, { ColumnsButton } from '../../components/DataTable';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useColumns } from '../../hooks/useColumns';
import { useDebounced } from '../../hooks/useDebounced';
import { useLoader } from '../../hooks/useLoader';
import { useUrlParams } from '../../hooks/useUrlParams';
import { api, errorMessage } from '../../lib/api';
import { userName } from '../../lib/format';
import { formatArs } from '../../lib/money';
import ContainerDialog from './ContainerDialog';

const mono = {
  fontFamily: 'ui-monospace, monospace',
  fontWeight: 800,
  whiteSpace: 'nowrap',
};
const dash = (
  <Typography variant="body2" color="text.disabled">
    —
  </Typography>
);

/** Columnas de la tabla de stock. Las marcadas `hidden` se pueden agregar desde "Columnas". */
const columnsFor = ({ setContainer }) => [
  { id: 'code', label: 'Código', sx: mono, render: (i) => i.code },
  {
    id: 'category',
    label: 'Categoría',
    sx: { maxWidth: 280 },
    render: (i) => (
      <>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {i.Category?.name}
        </Typography>
        {i.Category?.description && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {i.Category.description}
          </Typography>
        )}
      </>
    ),
  },
  {
    id: 'categoryCode',
    label: 'Código de categoría',
    hidden: true,
    sx: mono,
    render: (i) => i.Category?.code,
  },
  { id: 'type', label: 'Tipo', render: (i) => i.Category?.type },
  {
    id: 'unity',
    label: 'Unidad',
    hidden: true,
    render: (i) => i.Category?.unity,
  },
  {
    id: 'value',
    label: 'Valor',
    hidden: true,
    align: 'right',
    render: (i) => formatArs(i.Category?.value),
  },
  {
    id: 'weight',
    label: 'Peso',
    hidden: true,
    align: 'right',
    hint: 'kg',
    render: (i) => i.Category?.weight ?? '—',
  },
  { id: 'uses', label: 'Usos', align: 'right', render: (i) => i.uses ?? 0 },
  {
    id: 'owner',
    label: 'Responsable',
    hidden: true,
    render: (i) => userName(i.Owner) || dash,
  },
  {
    id: 'status',
    label: 'Estado',
    render: (i) => <Chip size="small" label={i.isActive ? 'Activo' : 'Inactivo'} color={i.isActive ? 'success' : 'default'} variant="outlined" />,
  },
  {
    id: 'contents',
    label: 'Contenido',
    render: (i) =>
      i.Category?.isContainer ? <Chip size="small" icon={<Inventory2Outlined />} label={`${i.contents.length} fijos`} onClick={() => setContainer(i)} variant="outlined" /> : dash,
  },
];
import CsvImportDialog from './CsvImportDialog';
import ItemFormDialog from './ItemFormDialog';

const ItemsPage = () => {
  const { can } = useAuth();
  const { notify, confirm } = useFeedback();
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null);
  const [menu, setMenu] = useState(null); // { anchor, item }
  const [container, setContainer] = useState(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const debouncedSearch = useDebounced(search);

  const isPhone = useMediaQuery((t) => t.breakpoints.down('sm'));
  const canCreate = can('items', 'create');
  const canUpdate = can('items', 'update');
  const columns = useColumns(
    'items',
    useMemo(() => columnsFor({ setContainer }), []),
  );

  const categories = useLoader(() => api.get('/categories').then((r) => r.data), []);
  // Desde el buscador: abrir "Agregar ítems" o "Importar", buscar un código o ver una categoría.
  useUrlParams(({ accion, buscar, categoria }) => {
    if (accion === 'nuevo' && canCreate) setCreating(true);
    if (accion === 'importar' && canCreate) setImporting(true);
    if (buscar) setSearch(buscar);
    if (categoria) setCategory((categories.data || []).find((c) => String(c.id) === categoria) || null);
    setPage(0);
  }, !!categories.data);
  const items = useLoader(
    () =>
      api
        .get('/items', {
          params: {
            page: page + 1,
            limit,
            search: debouncedSearch || undefined,
            category: category?.id,
          },
        })
        .then((r) => r.data),
    [page, limit, debouncedSearch, category],
  );

  const reloadAll = () => {
    items.reload();
    categories.reload();
  };

  const toggleItem = async (item) => {
    setMenu(null);
    if (item.isActive) {
      const ok = await confirm({
        title: `Desactivar ${item.code}`,
        message: 'Un ítem desactivado no se puede cargar en órdenes (por ejemplo, si está roto o en reparación).',
        confirmLabel: 'Desactivar',
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await api.patch(`/items/${item.id}`, { isActive: !item.isActive });
      notify(item.isActive ? `${item.code} desactivado.` : `${item.code} activado.`);
      items.reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const data = items.data;

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle="Cada unidad física del depósito, con su código."
        actions={
          canCreate && (
            <>
              <Button variant="outlined" startIcon={<UploadFileOutlined />} onClick={() => setImporting(true)}>
                Importar CSV
              </Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>
                Agregar ítems
              </Button>
            </>
          )
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          label="Buscar por código o categoría"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ flex: 1 }}
        />
        <Autocomplete
          sx={{ flex: 1 }}
          options={categories.data || []}
          loading={categories.loading}
          value={category}
          onChange={(_, v) => {
            setCategory(v);
            setPage(0);
          }}
          getOptionLabel={(c) => `${c.code} · ${c.name}`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => <TextField {...params} label="Filtrar por categoría" />}
        />
        {!isPhone && <ColumnsButton columns={columns} />}
      </Stack>

      {items.error ? (
        <ErrorState message={items.error} onRetry={items.reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Paper variant="outlined" sx={{ opacity: items.loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          {isPhone ? (
            // En el celular: una fila compacta por ítem en vez de la tabla ancha.
            <Box>
              {data.items.map((item) => (
                <Stack
                  key={item.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderBottom: 1,
                    borderColor: 'divider',
                    opacity: item.isActive ? 1 : 0.55,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: 'ui-monospace, monospace',
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                      noWrap
                    >
                      {item.code}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {item.Category?.name}
                      {!item.isActive ? ' · inactivo' : ''}
                    </Typography>
                  </Box>
                  {item.Category?.isContainer && (
                    <Chip size="small" icon={<Inventory2Outlined />} label={item.contents.length} onClick={() => setContainer(item)} variant="outlined" />
                  )}
                  {canUpdate && (
                    <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, item })} aria-label="Acciones">
                      <MoreVert fontSize="small" />
                    </IconButton>
                  )}
                </Stack>
              ))}
            </Box>
          ) : (
            <DataTable
              columns={columns}
              rows={data.items}
              minWidth={720}
              rowProps={(item) => ({
                sx: { opacity: item.isActive ? 1 : 0.55 },
              })}
              actions={
                canUpdate
                  ? (item) => (
                      <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, item })} aria-label="Acciones">
                        <MoreVert fontSize="small" />
                      </IconButton>
                    )
                  : undefined
              }
            />
          )}
          {!data.items.length && (
            <EmptyState title="No hay ítems para mostrar" description={search || category ? 'Probá con otra búsqueda.' : 'Agregá ítems o importalos desde un CSV.'} />
          )}
          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            <TablePagination
              component="div"
              count={data.totalItems}
              page={Math.min(page, Math.max(data.totalPages - 1, 0))}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={limit}
              onRowsPerPageChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Por página"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count.toLocaleString('es-AR')}`}
            />
          </Box>
        </Paper>
      )}

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        {menu && (
          <MenuItem onClick={() => toggleItem(menu.item)}>
            <ListItemIcon>{menu.item.isActive ? <ToggleOffOutlined fontSize="small" /> : <ToggleOnOutlined fontSize="small" />}</ListItemIcon>
            {menu.item.isActive ? 'Desactivar' : 'Activar'}
          </MenuItem>
        )}
        {menu?.item.Category?.isContainer && (
          <MenuItem
            onClick={() => {
              setContainer(menu.item);
              setMenu(null);
            }}
          >
            <ListItemIcon>
              <Inventory2Outlined fontSize="small" />
            </ListItemIcon>
            Contenido fijo
          </MenuItem>
        )}
      </Menu>

      <ItemFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        categories={categories.data || []}
        onSaved={() => {
          setCreating(false);
          reloadAll();
        }}
      />
      <CsvImportDialog
        open={importing}
        onClose={() => setImporting(false)}
        onImported={() => {
          setImporting(false);
          reloadAll();
        }}
      />
      <ContainerDialog
        container={container}
        canEdit={canUpdate}
        onClose={() => setContainer(null)}
        onChanged={async () => {
          setContainer(null);
          items.reload();
        }}
      />
    </>
  );
};

export default ItemsPage;
