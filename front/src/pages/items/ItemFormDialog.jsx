import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, Box, Grid, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import FormDialog from '../../components/FormDialog';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';
import CategoryFields from '../categories/CategoryFields';
import { EMPTY_CATEGORY, isCategoryComplete } from '../categories/categoryForm';

/** Alta de N ítems: en una categoría existente o creando la categoría en el mismo paso. */
const ItemFormDialog = ({ open, onClose, categories, onSaved }) => {
  const { notify } = useFeedback();
  const [mode, setMode] = useState('existing');
  const [category, setCategory] = useState(null);
  const [newCategory, setNewCategory] = useState(EMPTY_CATEGORY);
  const [quantity, setQuantity] = useState(1);
  const [uses, setUses] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('existing');
    setCategory(null);
    setNewCategory(EMPTY_CATEGORY);
    setQuantity(1);
    setUses(0);
  }, [open]);

  const active = useMemo(() => categories.filter((c) => c.isActive), [categories]);
  const types = useMemo(() => [...new Set(categories.map((c) => c.type).filter(Boolean))].sort(), [categories]);
  const valid = quantity >= 1 && (mode === 'existing' ? !!category : isCategoryComplete(newCategory));

  const save = async () => {
    setSaving(true);
    try {
      const payload = mode === 'existing' ? { categoryId: category.id } : newCategory;
      const { data } = await api.post('/items', { ...payload, quantity, uses });
      const codes = data.items.map((i) => i.code);
      notify(`${data.message} ${codes.length > 1 ? `${codes[0]} a ${codes[codes.length - 1]}` : codes[0]}`);
      onSaved();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open={open} onClose={onClose} title="Agregar ítems al stock" onSubmit={save} saving={saving} disabled={!valid} submitLabel="Crear ítems" maxWidth="md">
      <ToggleButtonGroup exclusive value={mode} onChange={(_, v) => v && setMode(v)} size="small" color="primary" fullWidth>
        <ToggleButton value="existing">Categoría existente</ToggleButton>
        <ToggleButton value="new">Categoría nueva</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'existing' ? (
        <Autocomplete
          options={active}
          value={category}
          onChange={(_, v) => setCategory(v)}
          getOptionLabel={(c) => `${c.code} · ${c.name}`}
          renderOption={(props, c) => (
            <li {...props} key={c.id}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {c.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {c.code} · {c.type} · {c.itemCount} en stock
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => <TextField {...params} label="Categoría" required autoFocus />}
        />
      ) : (
        <CategoryFields value={newCategory} onChange={setNewCategory} types={types} />
      )}

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            type="number"
            label="Cantidad de ítems"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(1000, Math.floor(Number(e.target.value) || 1))))}
            inputProps={{ min: 1, max: 1000 }}
            helperText="Máximo 1000 por carga"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            type="number"
            label="Usos previos"
            value={uses}
            onChange={(e) => setUses(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            inputProps={{ min: 0 }}
          />
        </Grid>
      </Grid>
      <Typography variant="body2" color="text.secondary">
        Los códigos se asignan solos y siguen la numeración de la categoría.
      </Typography>
    </FormDialog>
  );
};

export default ItemFormDialog;
