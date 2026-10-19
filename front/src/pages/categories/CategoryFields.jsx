import { Autocomplete, Checkbox, FormControlLabel, Grid, TextField } from '@mui/material';

/** Campos de una categoría (se usan al crear categorías y al crear ítems con categoría nueva). */
const CategoryFields = ({ value, onChange, types = [] }) => {
  const set = (field) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange({ ...value, [field]: v });
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={5}>
        <TextField
          fullWidth
          label="Código"
          value={value.code}
          onChange={set('code')}
          required
          helperText="Prefijo de los ítems: HDMI → HDMI-1, HDMI-2…"
          inputProps={{ style: { fontFamily: 'ui-monospace, monospace' } }}
        />
      </Grid>
      <Grid item xs={12} sm={7}>
        <TextField fullWidth label="Nombre" value={value.name} onChange={set('name')} required />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth label="Descripción" value={value.description ?? ''} onChange={set('description')} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Autocomplete
          freeSolo
          options={types}
          value={value.type}
          onInputChange={(_, v) => onChange({ ...value, type: v })}
          renderInput={(params) => <TextField {...params} label="Tipo" required helperText="Ej: cable, baúl, pantalla" />}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField fullWidth label="Unidad" value={value.unity} onChange={set('unity')} required helperText="Ej: mts, unidad, kg" />
      </Grid>
      <Grid item xs={6}>
        <TextField fullWidth type="number" label="Valor" value={value.value} onChange={set('value')} required inputProps={{ min: 0, step: 'any' }} />
      </Grid>
      <Grid item xs={6}>
        <TextField fullWidth type="number" label="Peso" value={value.weight} onChange={set('weight')} required inputProps={{ min: 0, step: 'any' }} />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={<Checkbox checked={!!value.isStorable} onChange={set('isStorable')} />}
          label="Se puede guardar dentro de un contenedor"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={<Checkbox checked={!!value.isContainer} onChange={set('isContainer')} />}
          label="Es un contenedor (baúl, rack, caja)"
        />
      </Grid>
    </Grid>
  );
};

export default CategoryFields;
