import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import Close from '@mui/icons-material/Close';
import { useFeedback } from '../context/FeedbackContext';
import { api, errorMessage } from '../lib/api';
import ImagePicker from './ImagePicker';

const TYPES = [
  { value: 'error', label: 'Algo no funciona' },
  { value: 'sugerencia', label: 'Sugerencia' },
  { value: 'consulta', label: 'Consulta' },
];

/** Reportar un problema al equipo de SRV, con captura opcional. Se adjunta sola la pantalla actual. */
const FeedbackDialog = ({ open, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { notify } = useFeedback();
  const [type, setType] = useState('error');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setType('error');
    setMessage('');
    setFile(null);
    setError('');
  };

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const form = new FormData();
      form.append('type', type);
      form.append('message', message.trim());
      form.append('pageUrl', window.location.href);
      if (file) form.append('file', file);
      const { data } = await api.post('/feedback', form);
      notify(data.message);
      reset();
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo enviar el reporte.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>Reportar un problema</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Le llega directo al equipo de SRV. Contanos qué pasó y, si podés, sumá una captura de pantalla.
          </Typography>
          <ToggleButtonGroup exclusive fullWidth size="small" color="primary" value={type} onChange={(_, v) => v && setType(v)}>
            {TYPES.map((t) => (
              <ToggleButton key={t.value} value={t.value}>
                {t.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            multiline
            minRows={4}
            autoFocus
            label={type === 'error' ? '¿Qué pasó? ¿Qué estabas haciendo?' : 'Contanos'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            inputProps={{ maxLength: 5000 }}
            helperText={message.trim().length < 10 ? 'Mínimo 10 caracteres' : `${message.length} / 5000`}
          />
          {preview ? (
            <Box sx={{ position: 'relative', alignSelf: 'flex-start' }}>
              <Box component="img" src={preview} alt="Captura adjunta" sx={{ maxWidth: '100%', maxHeight: 180, borderRadius: 2, border: 1, borderColor: 'divider', display: 'block' }} />
              <IconButton
                size="small"
                onClick={() => setFile(null)}
                aria-label="Quitar captura"
                sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <ImagePicker variant="outlined" startIcon={<AddPhotoAlternateOutlined />} onPick={setFile} onError={setError} sx={{ alignSelf: 'flex-start' }}>
              Adjuntar captura
            </ImagePicker>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={sending}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={send} disabled={sending || message.trim().length < 10}>
          {sending ? 'Enviando…' : 'Enviar reporte'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FeedbackDialog;
