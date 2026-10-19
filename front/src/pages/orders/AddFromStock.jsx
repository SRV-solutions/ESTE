import { useState } from 'react';
import { Autocomplete, Box, Button, Stack, TextField, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';

/**
 * Selector "categoría + cantidad" con lo que hay libre en el depósito.
 * Se usa para cargar ítems en la orden y para llenar un contenedor.
 */
const AddFromStock = ({ summary, loading, onAdd, label = 'Agregar desde el stock', buttonLabel = 'Agregar' }) => {
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  const max = selected?.count || 1;
  const valid = selected && quantity >= 1 && quantity <= max;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const ok = await onAdd(selected.category.id, quantity);
    setBusy(false);
    if (ok) {
      setSelected(null);
      setQuantity(1);
    }
  };

  return (
    <Stack component="form" onSubmit={submit} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
      <Autocomplete
        sx={{ flex: 1, minWidth: 0 }}
        options={summary || []}
        loading={loading}
        value={selected}
        onChange={(_, v) => {
          setSelected(v);
          setQuantity(1);
        }}
        isOptionEqualToValue={(a, b) => a.category.id === b.category.id}
        getOptionLabel={(o) => `${o.category.code} · ${o.category.name}`}
        filterOptions={(options, { inputValue }) => {
          const q = inputValue.trim().toLowerCase();
          return q
            ? options.filter((o) => `${o.category.code} ${o.category.name} ${o.category.type}`.toLowerCase().includes(q)).slice(0, 100)
            : options.slice(0, 100);
        }}
        renderOption={(props, o) => (
          <li {...props} key={o.category.id}>
            <Box sx={{ display: 'flex', width: '100%', gap: 1, alignItems: 'baseline' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {o.category.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {o.category.code} · {o.category.type}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', flexShrink: 0 }}>
                {o.count} libres
              </Typography>
            </Box>
          </li>
        )}
        noOptionsText="No hay stock libre que coincida"
        renderInput={(params) => <TextField {...params} label={label} />}
      />
      <TextField
        type="number"
        label="Cantidad"
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        inputProps={{ min: 1, max }}
        error={!!selected && quantity > max}
        helperText={selected ? `Máx. ${max}` : ' '}
        sx={{ width: { xs: '100%', sm: 120 } }}
      />
      <Button type="submit" variant="contained" startIcon={<Add />} disabled={!valid || busy} sx={{ height: 40, flexShrink: 0 }}>
        {busy ? 'Agregando…' : buttonLabel}
      </Button>
    </Stack>
  );
};

export default AddFromStock;
