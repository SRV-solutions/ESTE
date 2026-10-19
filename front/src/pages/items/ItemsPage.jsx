import { useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import MoreVert from '@mui/icons-material/MoreVert';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import ToggleOffOutlined from '@mui/icons-material/ToggleOffOutlined';
import ToggleOnOutlined from '@mui/icons-material/ToggleOnOutlined';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useDebounced } from '../../hooks/useDebounced';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';
import ContainerDialog from './ContainerDialog';
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

  const categories = useLoader(() => api.get('/categories').then((r) => r.data), []);
  const items = useLoader(
    () =>
      api
        .get('/items', { params: { page: page + 1, limit, search: debouncedSearch || undefined, category: category?.id } })
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
                  sx={{ px: 1.5, py: 1.25, borderBottom: 1, borderColor: 'divider', opacity: item.isActive ? 1 : 0.55 }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, fontSize: 13 }} noWrap>
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
          <TableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Usos</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Contenido</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id} hover sx={{ opacity: item.isActive ? 1 : 0.55 }}>
                    <TableCell sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 800, whiteSpace: 'nowrap' }}>{item.code}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                        {item.Category?.name}
                      </Typography>
                      {item.Category?.description && (
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          {item.Category.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{item.Category?.type}</TableCell>
                    <TableCell align="right">{item.uses ?? 0}</TableCell>
                    <TableCell>
                      <Chip size="small" label={item.isActive ? 'Activo' : 'Inactivo'} color={item.isActive ? 'success' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {item.Category?.isContainer ? (
                        <Chip
                          size="small"
                          icon={<Inventory2Outlined />}
                          label={`${item.contents.length} fijos`}
                          onClick={() => setContainer(item)}
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ width: 48 }}>
                      {canUpdate && (
                        <IconButton size="small" onClick={(e) => setMenu({ anchor: e.currentTarget, item })} aria-label="Acciones">
                          <MoreVert fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          )}
          {!data.items.length && (
            <EmptyState
              title="No hay ítems para mostrar"
              description={search || category ? 'Probá con otra búsqueda.' : 'Agregá ítems o importalos desde un CSV.'}
            />
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
