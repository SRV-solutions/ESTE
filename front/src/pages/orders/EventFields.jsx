import { Link as RouterLink } from 'react-router-dom';
import { Grid, Link, MenuItem, TextField, Typography } from '@mui/material';

/** Campos de un evento: se usan en el diálogo y directamente en "Nueva orden". */
const EventFields = ({ form, onChange, locations, autoFocus = false, columns = 1 }) => {
  const set = (field) => (e) => onChange({ ...form, [field]: e.target.value });
  const half = columns > 1 ? 6 : 12;
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={half}>
        <TextField fullWidth label="Nombre del evento" value={form.eventName} onChange={set('eventName')} required autoFocus={autoFocus} />
      </Grid>
      <Grid item xs={12} sm={half}>
        <TextField
          fullWidth
          label="Fecha y hora"
          type="datetime-local"
          value={form.dateEvent}
          onChange={set('dateEvent')}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>
      <Grid item xs={12} sm={half}>
        <TextField fullWidth select label="Lugar" value={form.locationId} onChange={set('locationId')} required>
          {locations.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.locationName} — {l.city}
            </MenuItem>
          ))}
        </TextField>
        {!locations.length && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Todavía no hay lugares cargados.{' '}
            <Link component={RouterLink} to="/locations">
              Crear un lugar
            </Link>
          </Typography>
        )}
      </Grid>
      <Grid item xs={12} sm={half}>
        <TextField fullWidth label="Organizador / empresa" value={form.organizer} onChange={set('organizer')} required />
      </Grid>
      <Grid item xs={12} sm={half}>
        <TextField fullWidth label="Productor / contacto" value={form.producer} onChange={set('producer')} required />
      </Grid>
      <Grid item xs={12} sm={half}>
        <TextField fullWidth label="Cliente final" value={form.finalClient} onChange={set('finalClient')} required />
      </Grid>
    </Grid>
  );
};

export default EventFields;
