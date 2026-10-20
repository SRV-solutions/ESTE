import { useState } from 'react';
import { Box, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import { ErrorState, Loading, PageHeader, StatTile, StatusChip } from '../../components/ui';
import { useLoader } from '../../hooks/useLoader';
import { api } from '../../lib/api';
import { userName } from '../../lib/format';
import { STATUS_ORDER } from '../../lib/status';
import { BRAND } from '../../theme';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(2, 4)}`;

/**
 * Barras verticales de una sola serie (una medida, un color): columnas finas con la punta redondeada,
 * valor arriba solo en el máximo, y el detalle en el tooltip de cada barra.
 */
const Columns = ({ data, label, value, hint, height = 160 }) => {
  const max = Math.max(...data.map(value), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height, mt: 1 }}>
      {data.map((d) => {
        const v = value(d);
        const h = Math.round(((height - 36) * v) / max);
        return (
          <Tooltip key={label(d)} title={hint(d)} arrow>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', cursor: 'default' }}>
              {v === max && v > 0 && (
                <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  {v}
                </Typography>
              )}
              <Box sx={{ width: '100%', maxWidth: 36, height: Math.max(h, v ? 4 : 2), bgcolor: v ? 'primary.main' : 'divider', borderRadius: '4px 4px 0 0', transition: 'height .2s' }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'nowrap' }}>
                {label(d)}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

/** Barras horizontales para rankings: etiqueta, barra fina y valor. */
const Bars = ({ data, label, value, sub, empty }) => {
  const max = Math.max(...data.map(value), 1);
  if (!data.length)
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        {empty}
      </Typography>
    );
  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {data.map((d, i) => (
        <Box key={i}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
              {label(d)}
              {sub && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {' '}
                  · {sub(d)}
                </Typography>
              )}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, flexShrink: 0 }}>
              {value(d)}
            </Typography>
          </Stack>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', mt: 0.5 }}>
            <Box sx={{ width: `${(value(d) / max) * 100}%`, height: '100%', borderRadius: 3, bgcolor: 'primary.main' }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

const Section = ({ title, hint, children }) => (
  <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
    <Typography variant="h6">{title}</Typography>
    {hint && (
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    )}
    {children}
  </Paper>
);

/** Reportes y estadísticas de uso del stock (plan Empresa). */
const ReportsPage = () => {
  const [months, setMonths] = useState(6);
  const { data, loading, error, reload } = useLoader(() => api.get('/reports/overview', { params: { months } }).then((r) => r.data), [months]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { stock, cycle, checkins } = data;
  const statusRows = STATUS_ORDER.map((s) => ({ status: s, total: data.ordersByStatus.find((x) => x.status === s)?.total ?? 0 })).filter((x) => x.total);
  const unusedPct = stock.activeItems ? Math.round((stock.neverUsed / stock.activeItems) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Qué se usa, qué está parado y cómo viene el ritmo de eventos."
        actions={
          <TextField select size="small" label="Período" value={months} onChange={(e) => setMonths(Number(e.target.value))} sx={{ minWidth: 160 }}>
            {[3, 6, 12, 24].map((m) => (
              <MenuItem key={m} value={m}>
                Últimos {m} meses
              </MenuItem>
            ))}
          </TextField>
        }
      />

      <Grid container spacing={1.5} sx={{ mb: 2, opacity: loading ? 0.6 : 1 }}>
        <Grid item xs={6} md={3}>
          <StatTile label="Ítems activos" value={stock.activeItems.toLocaleString('es-AR')} hint={`${stock.categories} categorías · ${stock.containers} contenedores`} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="En uso ahora" value={stock.inUse.toLocaleString('es-AR')} hint="En órdenes sin desarmar" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Nunca usados" value={`${unusedPct}%`} hint={`${stock.neverUsed.toLocaleString('es-AR')} ítems sin ninguna orden`} accent={unusedPct > 50 ? BRAND.orange : undefined} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Ciclo promedio" value={cycle.avgDays != null ? `${cycle.avgDays} d` : '—'} hint={cycle.closed ? `De creada a desarmada · ${cycle.closed} órdenes` : 'Sin órdenes cerradas en el período'} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Section title="Órdenes por mes" hint="Creadas en cada mes del período">
            <Columns data={data.ordersByMonth} label={(d) => monthLabel(d.month)} value={(d) => d.total} hint={(d) => `${d.total} órdenes · ${d.disassembled} ya desarmadas`} />
          </Section>
        </Grid>
        <Grid item xs={12} md={5}>
          <Section title="Órdenes por estado" hint="Todas las órdenes, hoy">
            <Table size="small" sx={{ mt: 1 }}>
              <TableBody>
                {statusRows.map((r) => (
                  <TableRow key={r.status}>
                    <TableCell sx={{ pl: 0 }}>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, pr: 0 }}>
                      {r.total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Categorías más pedidas" hint="Veces que un ítem de la categoría entró en una orden">
            <Bars data={data.topCategories} label={(d) => d.name} sub={(d) => `${d.orders} órdenes`} value={(d) => d.times} empty="Sin órdenes con material en el período." />
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Ítems más usados" hint="Usos acumulados de cada unidad">
            <Bars data={data.topItems} label={(d) => d.code} sub={(d) => d.category} value={(d) => d.uses} empty="Todavía ningún ítem registró usos." />
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Lugares con más eventos" hint="Eventos en el período">
            <Bars data={data.topLocations} label={(d) => d.name} sub={(d) => `${d.city} · ${d.orders} órdenes`} value={(d) => d.events} empty="Sin eventos en el período." />
          </Section>
        </Grid>
        <Grid item xs={12} md={6}>
          <Section title="Quién pide más" hint="Órdenes creadas por persona">
            <Bars data={data.topPeople} label={(d) => userName(d)} value={(d) => d.orders} empty="Sin órdenes en el período." />
          </Section>
        </Grid>
        <Grid item xs={12}>
          <Section title="Check-in / out" hint="Registros en el período">
            <Table size="small" sx={{ mt: 1, maxWidth: 480 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 0 }}>Registros</TableCell>
                  <TableCell align="right">Check-in</TableCell>
                  <TableCell align="right">Check-out</TableCell>
                  <TableCell align="right" sx={{ pr: 0 }}>
                    En el lugar
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ pl: 0, fontWeight: 800 }}>{checkins.total}</TableCell>
                  <TableCell align="right">{checkins.ins}</TableCell>
                  <TableCell align="right">{checkins.outs}</TableCell>
                  <TableCell align="right" sx={{ pr: 0 }}>
                    {checkins.total ? `${Math.round((checkins.onSite / checkins.total) * 100)}%` : '—'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Section>
        </Grid>
      </Grid>
    </>
  );
};

export default ReportsPage;
