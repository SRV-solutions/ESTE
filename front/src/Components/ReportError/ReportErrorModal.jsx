import { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Backdrop,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import styles from './style.module.css';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 500,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

const ReportErrorModal = () => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFileToBackend = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await axios.post(`${apiUrl}/reports/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return res.data.fileUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const uploadedFileUrls = files.length
        ? await Promise.all(files.map(uploadFileToBackend))
        : ['Sin Archivos'];

      const joinedUrls = uploadedFileUrls.join(', ');

      const formData = new FormData();
      formData.append('entry.1466397243', description);
      formData.append('entry.1226277495', joinedUrls);

      await fetch(
        'https://docs.google.com/forms/d/e/1FAIpQLSebVonRj5bu35WZxzPwZ4ZgAoNm_gbkZjnGCsKXeFB5LrFbNg/formResponse',
        {
          method: 'POST',
          mode: 'no-cors',
          body: formData,
        }
      );

      setSnackbar({ open: true, message: 'Reporte enviado correctamente. ¡Gracias!', severity: 'success' });
      setDescription('');
      setFiles([]);
      handleClose();
    } catch (err) {
      console.error('Error al enviar reporte:', err);
      setSnackbar({ open: true, message: 'No se pudo enviar el reporte.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      {!isLoginPage && (
        <Tooltip title="Reportar un error" arrow placement="left">
          <div className={styles.reportButton} onClick={handleOpen}>
            !
          </div>
        </Tooltip>
      )}

      <Modal open={open} onClose={handleClose}>
        <Box sx={{ ...modalStyle, position: 'relative' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                bgcolor: 'rgba(255, 255, 255, 0.7)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
              }}
            >
              <CircularProgress />
            </Box>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Reportar un error</Typography>
            <IconButton onClick={handleClose} disabled={loading}>
              <CloseIcon />
            </IconButton>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              multiline
              rows={4}
              fullWidth
              required
              label="Describí paso por paso lo que ocurrió"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              disabled={loading}
            />
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              disabled={loading}
              style={{ marginTop: 16, marginBottom: 16 }}
            />
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button variant="contained" type="submit" disabled={loading}>
                Enviar
              </Button>
              <Button onClick={handleClose} disabled={loading}>
                Cerrar
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ReportErrorModal;
