import { Grid, MenuItem, TextField } from '@mui/material';
import { TAX_CONDITIONS } from '../../lib/money';

/** Datos de una empresa: los usa su administrador y el panel de SRV. */
const CompanyForm = ({ value, onChange, errors = {} }) => {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  const field = (key, label, { helperText, ...props } = {}) => (
    <TextField fullWidth {...props} label={label} value={value[key] ?? ''} onChange={set(key)} error={!!errors[key]} helperText={errors[key] || helperText} />
  );
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        {field('name', 'Nombre comercial', { required: true, helperText: 'Aparece en la app y en los PDF de órdenes' })}
      </Grid>
      <Grid item xs={12} sm={6}>
        {field('legalName', 'Razón social', { helperText: 'Para la factura' })}
      </Grid>
      <Grid item xs={12} sm={6}>
        {field('cuit', 'CUIT', { helperText: 'Solo números. Si no tiene, se factura a consumidor final', inputProps: { inputMode: 'numeric', maxLength: 13 } })}
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField select fullWidth label="Condición frente al IVA" value={value.taxCondition || 'consumidor_final'} onChange={set('taxCondition')}>
          {TAX_CONDITIONS.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        {field('email', 'Email de facturación', { type: 'email' })}
      </Grid>
      <Grid item xs={12} sm={6}>
        {field('phone', 'Teléfono')}
      </Grid>
      <Grid item xs={12}>
        {field('address', 'Dirección')}
      </Grid>
      <Grid item xs={12}>
        {field('logoUrl', 'Logo (URL)', { helperText: 'Imagen https para el encabezado de los PDF de órdenes', placeholder: 'https://…' })}
      </Grid>
    </Grid>
  );
};

export default CompanyForm;
