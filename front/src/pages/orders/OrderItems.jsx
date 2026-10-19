import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMore from '@mui/icons-material/ExpandMore';
import SwapHoriz from '@mui/icons-material/SwapHoriz';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import DeleteSweepOutlined from '@mui/icons-material/DeleteSweepOutlined';
import { EmptyState } from '../../components/ui';
import AddFromStock from './AddFromStock';

const ItemRow = ({ item, canEdit, onSwap, onRemove, children, badge }) => (
  <Box sx={{ py: 1, px: 1.5, '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' } }}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography sx={{ fontWeight: 800, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, flex: 1, minWidth: 0 }} noWrap>
        {item.code}
      </Typography>
      {badge}
      {canEdit && onSwap && (
        <Tooltip title="Cambiar por otro de la misma categoría">
          <IconButton size="small" onClick={() => onSwap(item)}>
            <SwapHoriz fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {canEdit && onRemove && (
        <Tooltip title="Quitar de la orden">
          <IconButton size="small" onClick={() => onRemove(item)} sx={{ '&:hover': { color: 'error.main' } }}>
            <DeleteOutline fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
    {children}
  </Box>
);

/** Un contenedor de la orden con lo que lleva adentro (contenido fijo + lo cargado en esta orden). */
const ContainerBlock = ({ item, canEdit, storableSummary, onSwap, onRemove, onRemoveContent, onFill, onEmpty }) => {
  const [open, setOpen] = useState(false);
  const fixed = item.contents.filter((c) => c.source === 'permanent').length;
  const loaded = item.contents.length - fixed;
  return (
    <ItemRow
      item={item}
      canEdit={canEdit}
      onSwap={onSwap}
      onRemove={onRemove}
      badge={
        <Chip
          size="small"
          icon={<Inventory2Outlined />}
          label={`${item.contents.length} adentro`}
          onClick={() => setOpen((v) => !v)}
          color={open ? 'primary' : 'default'}
          variant={open ? 'filled' : 'outlined'}
        />
      }
    >
      {open && (
        <Box sx={{ mt: 1, ml: { sm: 2 }, pl: 1.5, borderLeft: 2, borderColor: 'primary.main' }}>
          {fixed > 0 && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
              Este contenedor tiene contenido fijo: viaja tal cual y no se le cargan ítems por orden.
            </Typography>
          )}
          {item.contents.length ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {item.contents.map((c) => (
                <Chip
                  key={c.id}
                  size="small"
                  label={c.code}
                  variant={c.source === 'permanent' ? 'outlined' : 'filled'}
                  title={`${c.Category?.name}${c.source === 'permanent' ? ' (fijo)' : ''}`}
                  onDelete={canEdit && c.source === 'order' ? () => onRemoveContent(item, c) : undefined}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Vacío.
            </Typography>
          )}
          {canEdit && loaded > 0 && (
            <Button size="small" color="error" startIcon={<DeleteSweepOutlined />} onClick={() => onEmpty(item)} sx={{ mt: 1 }}>
              Vaciar {item.code}
            </Button>
          )}
          {canEdit && item.acceptsOrderContents && (
            <Box sx={{ mt: 1.5 }}>
              <AddFromStock
                summary={storableSummary}
                label="Guardar adentro"
                buttonLabel="Guardar"
                onAdd={(categoryId, quantity) => onFill(item, categoryId, quantity)}
              />
            </Box>
          )}
        </Box>
      )}
    </ItemRow>
  );
};

/** Material de la orden agrupado por categoría. */
const OrderItems = ({ items, canEdit, storableSummary, onSwap, onRemove, onRemoveContent, onFill, onEmpty }) => {
  const groups = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const g = map.get(item.categoryId) ?? { category: item.Category, items: [] };
      g.items.push(item);
      map.set(item.categoryId, g);
    }
    return [...map.values()].sort((a, b) => a.category.name.localeCompare(b.category.name, 'es'));
  }, [items]);

  if (!items.length) {
    return (
      <Paper variant="outlined">
        <EmptyState
          title="La orden todavía no tiene ítems"
          description={canEdit ? 'Buscá una categoría arriba y elegí cuántos ítems llevar.' : undefined}
        />
      </Paper>
    );
  }

  return (
    <Box>
      {groups.map(({ category, items: groupItems }) => (
        <Accordion key={category.id} disableGutters variant="outlined" sx={{ '&:not(:last-of-type)': { borderBottom: 0 }, '&::before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1, pr: 1 }}>
              <Box
                sx={{
                  minWidth: 40,
                  height: 28,
                  px: 1,
                  borderRadius: 1,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 900,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                }}
              >
                {groupItems.length}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800 }} noWrap>
                  {category.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {category.code} · {category.type}
                  {category.isContainer ? ' · contenedor' : ''}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0, borderTop: 1, borderColor: 'divider' }}>
            {groupItems.map((item) =>
              item.Category.isContainer ? (
                <ContainerBlock
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  storableSummary={storableSummary}
                  onSwap={onSwap}
                  onRemove={onRemove}
                  onRemoveContent={onRemoveContent}
                  onFill={onFill}
                  onEmpty={onEmpty}
                />
              ) : (
                <ItemRow key={item.id} item={item} canEdit={canEdit} onSwap={onSwap} onRemove={onRemove} />
              ),
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default OrderItems;
