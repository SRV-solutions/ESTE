import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';

const FeedbackContext = createContext(null);

/**
 * Un solo snackbar y un solo diálogo de confirmación para toda la app
 * (reemplaza los window.confirm y los snackbars repetidos en cada pantalla).
 */
export const FeedbackProvider = ({ children }) => {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const notify = useCallback((message, severity = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  const confirm = useCallback(
    ({ title, message, confirmLabel = 'Confirmar', danger = false }) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog({ title, message, confirmLabel, danger });
      }),
    [],
  );

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  };

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={toast.severity === 'error' ? 8000 : 4000}
        onClose={(_, reason) => reason !== 'clickaway' && setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          variant="filled"
          severity={toast.severity}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ width: '100%', fontWeight: 600 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
      <Dialog open={!!dialog} onClose={() => close(false)} maxWidth="xs" fullWidth>
        {dialog && (
          <>
            <DialogTitle>{dialog.title}</DialogTitle>
            {dialog.message && (
              <DialogContent>
                <DialogContentText sx={{ whiteSpace: 'pre-line' }}>{dialog.message}</DialogContentText>
              </DialogContent>
            )}
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => close(false)} color="inherit">
                Cancelar
              </Button>
              <Button
                onClick={() => close(true)}
                variant="contained"
                color={dialog.danger ? 'error' : 'primary'}
                autoFocus
              >
                {dialog.confirmLabel}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </FeedbackContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback debe usarse dentro de <FeedbackProvider>');
  return ctx;
};
