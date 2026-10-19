import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/** Diálogo de formulario estándar: envía con Enter y bloquea el botón mientras guarda. */
const FormDialog = ({ open, onClose, title, onSubmit, submitLabel = 'Guardar', saving = false, maxWidth = 'sm', children, disabled }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!saving && !disabled) onSubmit();
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth={maxWidth} fullWidth fullScreen={fullScreen}>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {children}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={saving || disabled}>
            {saving ? 'Guardando…' : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FormDialog;
