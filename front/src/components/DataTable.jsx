import { useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ViewColumnOutlined from '@mui/icons-material/ViewColumnOutlined';

/**
 * Botón "Columnas": abre un panel para elegir qué columnas se ven.
 * Recibe lo que devuelve `useColumns`.
 */
export const ColumnsButton = ({ columns, size = 'medium' }) => {
  const [anchor, setAnchor] = useState(null);
  const { all, visibleIds, toggle, reset, isDefault } = columns;
  const hiddenCount = all.length - visibleIds.length;

  return (
    <>
      <Tooltip title="Elegir columnas">
        <Badge color="secondary" variant="dot" invisible={isDefault} overlap="circular">
          <Button variant="outlined" color="inherit" size={size} startIcon={<ViewColumnOutlined />} onClick={(e) => setAnchor(e.currentTarget)} sx={{ whiteSpace: 'nowrap' }}>
            Columnas
          </Button>
        </Badge>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 1.5, minWidth: 240, maxHeight: 420 } } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 1, display: 'block', mb: 0.5 }}>
          Mostrar en la tabla
          {hiddenCount > 0 && ` · ${hiddenCount} oculta${hiddenCount === 1 ? '' : 's'}`}
        </Typography>
        <Stack sx={{ px: 0.5 }}>
          {all.map((c) => {
            const on = visibleIds.includes(c.id);
            return (
              <FormControlLabel
                key={c.id}
                control={<Checkbox size="small" checked={on} onChange={() => toggle(c.id)} disabled={on && visibleIds.length === 1} />}
                label={
                  <span>
                    {c.label}
                    {c.hint && (
                      <Typography component="span" variant="caption" color="text.secondary">
                        {' '}
                        · {c.hint}
                      </Typography>
                    )}
                  </span>
                }
                sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 14 } }}
              />
            );
          })}
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Button size="small" onClick={reset} disabled={isDefault} fullWidth>
          Volver a las columnas de siempre
        </Button>
      </Popover>
    </>
  );
};

/**
 * Tabla con columnas configurables.
 * - `columns`: lo que devuelve `useColumns` (usa `columns.visible`).
 * - Cada columna: { id, label, align?, sx?, render(row) }.
 * - `actions(row)`: celda final de acciones (opcional, no se oculta).
 * - `rowProps(row)`: props extra para cada fila (onClick, sx…).
 */
const DataTable = ({ columns, rows, rowKey = (r) => r.id, actions, rowProps, minWidth = 640, footer }) => {
  const cols = columns.visible;
  return (
    <TableContainer>
      <Table
        size="small"
        sx={{
          minWidth: Math.min(minWidth, 120 * cols.length + (actions ? 48 : 0)),
        }}
      >
        <TableHead>
          <TableRow>
            {cols.map((c) => (
              <TableCell key={c.id} align={c.align} sx={c.headSx}>
                {c.label}
              </TableCell>
            ))}
            {actions && <TableCell align="right" sx={{ width: 48 }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)} hover {...(rowProps ? rowProps(row) : {})}>
              {cols.map((c) => (
                <TableCell key={c.id} align={c.align} sx={c.sx}>
                  {c.render(row)}
                </TableCell>
              ))}
              {actions && (
                <TableCell align="right" sx={{ width: 48 }}>
                  {actions(row)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {footer}
    </TableContainer>
  );
};

export default DataTable;
