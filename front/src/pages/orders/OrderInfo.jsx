import { Box, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { formatDateTime, userName } from '../../lib/format';
import { ORDER_DATES, RESPONSIBLES } from './orderDates';

const Field = ({ label, value }) => (
  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </Typography>
    <Typography variant="body2" component="div" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
      {value || '—'}
    </Typography>
  </Stack>
);

const Card = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: 2.25, height: '100%' }}>
    <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    <Stack spacing={1.5}>{children}</Stack>
  </Paper>
);

/** Datos del evento, responsables y fechas de la orden. */
const OrderInfo = ({ order, showStageOwners }) => {
  const event = order.Event || {};
  const location = event.Location || {};
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={4}>
        <Card title="Evento">
          <Field label="Fecha" value={formatDateTime(event.dateEvent)} />
          <Field label="Lugar" value={[location.locationName, location.address, location.city].filter(Boolean).join(' · ')} />
          <Field label="Empresa · contacto" value={[event.organizer, event.producer].filter(Boolean).join(' · ')} />
          <Field label="Cliente final" value={event.finalClient} />
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card title="Responsables por etapa">
          {RESPONSIBLES.filter((r) => !r.stageOwner || showStageOwners || order[r.field]).map((r) => {
            const person = order[r.relation];
            const current = order.access?.stage?.key === r.stage;
            return (
              <Field
                key={r.field}
                label={r.label}
                value={
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    {userName(person) ||
                      (r.field === 'orderedBy' ? '—' : r.field === 'checkedBy' ? 'Sin asignar (la revisa un administrador)' : 'Sin asignar (la avanza quien la creó)')}
                    {current && <Chip size="small" color="secondary" label="Etapa actual" sx={{ height: 20, fontSize: 11 }} />}
                  </Box>
                }
              />
            );
          })}
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card title="Fechas">
          {ORDER_DATES.map(({ key, label }) => (
            <Field key={key} label={label} value={formatDateTime(order[key])} />
          ))}
        </Card>
      </Grid>
      {order.observations && (
        <Grid item xs={12}>
          <Card title="Observaciones">
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {order.observations}
            </Typography>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default OrderInfo;
